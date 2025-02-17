import { ChatMessage } from '../types/model';
import { modelConfig } from '../config';
import { ChatService } from './chat';
import { Tool,TASK_COMPLETE_SIGNAL} from '../types';
import { logger } from './tools';

interface ToolCall {
    toolName: string;
    params: Record<string, any>;
}

export class AgentService {
    private chatService: ChatService;
    private tools: Tool[];
    private toolMap: Map<string, Tool>;
    private userName: string;

    constructor(tools: Tool[], userName: string = 'User') {
        const completeTool: Tool = {
            name: "complete",
            description: "Call this tool when you have completed the user's request and no further actions are needed",
            parameters: {
                type: "object",
                properties: {},
                required: []
            },
            execute: async () => TASK_COMPLETE_SIGNAL
        };

        this.chatService = ChatService.getInstance(modelConfig.chat.type, modelConfig.chat.config);
        this.tools = [...tools, completeTool];
        this.toolMap = new Map(this.tools.map(tool => [tool.name, tool]));
        this.userName = userName;
        logger.info('AgentService', `Initialized with ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
    }

    private createAgentPrompt(): string {
        logger.debug('AgentService', 'Creating agent prompt');
        const currentTime = new Date();
        const timeStr = currentTime.toLocaleString();
        return `You are an intelligent AI assistant specialized in managing ${this.userName}'s personal data and providing insightful responses. Current time is: ${timeStr}. Your dual role includes:

1. Data Management:
   - Organizing and storing various types of data including:
     * Notes and Documents
     * Recipes and Cooking Instructions
     * Daily Journals and Diaries
     * Todo Lists and Tasks
     * Any other personal information

2. Knowledge Assistant:
   - Answering questions using stored information
   - Providing insights and connections between different pieces of data
   - Making recommendations based on user's historical data
   - Helping users make better use of their stored information

CRITICAL INSTRUCTION:
YOU MUST ONLY RESPOND WITH TOOL CALLS. Never write direct messages or explanations. All communication, including explanations, status updates, and responses to the user, must be done through the replyUser tool.

Available Tools:
${this.tools.map(tool => `
- ${tool.name}: ${tool.description}
  Required Parameters: ${tool.parameters.required.join(', ')}
  Call Format: <call>${tool.name}(${tool.parameters.required.map(param => `${param}="value"`).join(', ')})</call>
`).join('\n')}

IMPORTANT RULES for using tools:
1. ALWAYS use <call>...</call> tags when calling a tool
2. ALWAYS include ALL required parameters
3. ALWAYS use double quotes ("") for parameter values
4. NEVER modify the tool names or parameter names
5. NEVER skip required parameters
6. If a tool call fails, explain why and retry with corrected parameters
7. Only use tools that are explicitly provided in the list above
8. NEVER make up fake responses or tool results
9. NEVER write direct text responses - everything must be a tool call
10. Use replyUser for ALL communication with the user
11. When storing user data, maintain data integrity by preserving the original content exactly as provided - never modify or fabricate any part of user-provided information
12. NEVER refer to tool names when speaking to the USER
13. ALWAYS call the complete tool when you have finished handling the user's request and no further actions are needed

WORKFLOW GUIDELINES:
1. When user requests to save information:
   - Create a new note with appropriate title and content
   - Add relevant tags for better organization
   - Use replyUser to confirm when the note is saved
   - Call complete when done

2. When user asks to find information:
   - List relevant notes using listNotes with appropriate tags
   - View specific notes as needed
   - Analyze and synthesize information from multiple notes
   - Present comprehensive answers using replyUser
   - Call complete when done

3. When answering questions:
   - Search through relevant notes for accurate information
   - Combine information from multiple sources when needed
   - Provide context and sources using replyUser
   - Suggest related information using replyUser
   - Call complete when done

Remember: EVERY response must be a tool call. No direct text allowed.`;
    }

    private parseToolCalls(response: string): ToolCall[] {
        logger.debug('AgentService', 'Parsing tool calls from response');
        const toolCalls: ToolCall[] = [];
        const regex = /<call>(\w+)\((.*?)\)<\/call>/g;
        let match;

        while ((match = regex.exec(response)) !== null) {
            const toolName = match[1];
            const paramsStr = match[2];
            const params: Record<string, any> = {};

            // Parse parameters
            const paramMatches = paramsStr.matchAll(/(\w+)="([^"]*)"/g);
            for (const [, key, value] of paramMatches) {
                // Handle array parameters
                if (value.includes(',')) {
                    params[key] = value.split(',').map(v => v.trim());
                } else {
                    params[key] = value;
                }
            }

            toolCalls.push({ toolName, params });
        }

        return toolCalls;
    }

    public async chat(messages: ChatMessage[]): Promise<void> {
        logger.info('AgentService', `Starting chat with ${messages.length} messages`);
        
        // Ensure system prompt is present and up to date
        if (messages[0]?.role !== 'system') {
            messages.unshift({ role: 'system', content: this.createAgentPrompt() });
        } else {
            messages[0].content = this.createAgentPrompt();
        }

        try {
            const response = await this.chatService.chat(messages);
            logger.debug('AgentService', 'Received response from OpenAI', response);
            messages.push({ role: "assistant", content: response });
            
            // Parse and execute tool calls
            const toolCalls = this.parseToolCalls(response);
            logger.debug('AgentService', `Found ${toolCalls.length} tool calls in response`);
            if (toolCalls.length > 0) {
                // Execute all tool calls in sequence
                for (const toolCall of toolCalls) {
                    const tool = this.toolMap.get(toolCall.toolName);
                    if (tool) {
                        logger.debug('AgentService', `Processing tool call: ${toolCall.toolName}`);
                        const result = await tool.execute(toolCall.params);
                        logger.debug('AgentService', `${toolCall.toolName} execution result:`, result);
                        // Check if task is complete
                        if (result === TASK_COMPLETE_SIGNAL) {
                            logger.info('AgentService', 'Task complete signal received');
                            return;
                        }
                        // Add tool response to message history
                        messages.push({ 
                            role: "system", 
                            content: JSON.stringify(result)
                        });
                    }
                }
                await this.chat(messages);
            }
        } catch (error) {
            logger.error('AgentService', 'Error in chat:', error);
            throw error;
        }
    }
}
