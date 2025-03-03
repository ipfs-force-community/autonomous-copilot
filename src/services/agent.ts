import { ChatMessage } from '../types/model';
import { modelConfig } from '../config';
import { ChatService } from './chat';
import { Tool, TASK_COMPLETE_SIGNAL } from '../types';
import { Logger } from './tools';
import { XMLParser } from 'fast-xml-parser';

var logger = new Logger('AgentService');

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
        logger.info(`Initialized with ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
    }

    private createAgentPrompt(): string {
        logger.debug('Creating agent prompt');
        const currentTime = new Date();
        const timeStr = currentTime.toLocaleString();
        return `You are Autonomous Copilot, an intelligent AI assistant built on the Autonomys Network, designed to help users securely store fragmented data while making informed decisions. Current time is: ${timeStr}. All user data is permanently preserved on the Autonomys Network, ensuring long-term data persistence and security. Your capabilities include:

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
  Call Format:
  <invoke name="${tool.name}">
${tool.parameters.required.map(param => `    <parameter name="${param}">value</parameter>`).join('\n')}
  </invoke>
`).join('\n')}

IMPORTANT RULES for using tools:
1. ALWAYS use <invoke>...</invoke> tags when calling a tool
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
14. When using tools that may take some time to process, proactively acknowledge the user's request and set appropriate expectations for response time

WORKFLOW GUIDELINES:
1. When user requests to save information:
   - Create a new note with appropriate title and content
   - Add relevant tags for better organization
   - Inform user that note saving operation may take some time to process
   - Use replyUser to confirm when the note is saved, and provide some basic metadata
   - Call complete when done

2. When user asks to find information:
   - Search for relevant notes using searchNotes with the user's query
   - If specific tags are mentioned, use listNotes with those tags
   - View detailed note contents using viewNote for the most relevant results
   - Analyze and synthesize information from multiple notes
   - Present comprehensive answers using replyUser
   - Call complete when done

3. When answering questions:
   - Inform user that It may take some time to gather all necessary information
   - Search through relevant notes for accurate information
   - Combine information from multiple sources when needed
   - Provide context and sources using replyUser
   - Suggest related information using replyUser
   - Call complete when done

Remember: EVERY response must be a tool call. No direct text allowed.`;
    }



    public async chat(messages: ChatMessage[]): Promise<void> {
        logger.info(`Starting chat with ${messages.length} messages`);

        // Ensure system prompt is present and up to date
        if (messages[0]?.role !== 'system') {
            messages.unshift({ role: 'system', content: this.createAgentPrompt() });
        } else {
            messages[0].content = this.createAgentPrompt();
        }

        try {
            const startTime = Date.now();
            const response = await this.chatService.chat(messages);
            const endTime = Date.now();
            logger.debug(`Received response from OpenAI in ${endTime - startTime}ms`, response, messages);
            messages.push({ role: "assistant", content: response });

            // Parse and execute tool calls
            const toolCalls = parseToolCalls(response);
            logger.debug(`Found ${toolCalls.length} tool calls in response`);
            if (toolCalls.length > 0) {
                // Execute all tool calls in sequence
                for (const toolCall of toolCalls) {
                    const tool = this.toolMap.get(toolCall.toolName);
                    if (tool) {
                        const startTime = Date.now();
                        const result = await tool.execute(toolCall.params);
                        const endTime = Date.now();
                        logger.debug(`${toolCall.toolName} execution complete in ${endTime - startTime}ms`, result);
                        // Check if task is complete
                        if (result === TASK_COMPLETE_SIGNAL) {
                            logger.info('Task complete signal received');
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
            logger.error('Error in chat:', error);
            throw error;
        }
    }
}


export function parseToolCalls(response: string): ToolCall[] {
    const toolCalls: ToolCall[] = [];
    const parser = new XMLParser({
        ignoreAttributes: false,
        attributeNamePrefix: "",
        textNodeName: "value"
    });


   try {
        const xmlContent = `<root>${response}</root>`;
        const result = parser.parse(xmlContent);
        
        // Handle single invoke or multiple invokes
        const invokes = Array.isArray(result.root.invoke) ? result.root.invoke : [result.root.invoke];

        for (const invoke of invokes) {
            if (!invoke) continue;
            
            const toolName = invoke.name;
            const parameters = invoke.parameter;
            const params: Record<string, any> = {};

            // Handle single parameter or multiple parameters
            if (Array.isArray(parameters)) {
                for (const param of parameters) {
                    if (param && param.name && param.value) {
                        params[param.name] = param.value;
                    }
                }
            } else if (parameters && parameters.name && parameters.value) {
                params[parameters.name] = parameters.value;
            }

            toolCalls.push({ toolName, params });
        }
    } catch (error) {
        console.error('Error parsing XML:', error);
    }

    return toolCalls;
}
