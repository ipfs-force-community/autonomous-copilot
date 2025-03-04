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
    private sendAction: (action: string) => Promise<void>;

    constructor(tools: Tool[], sendAction: (action: string) => Promise<void>) {
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
        this.sendAction = sendAction;
        logger.info(`Initialized with ${tools.length} tools: ${tools.map(t => t.name).join(', ')}`);
    }

    private sendActionBackground(action: string) {
        // 直接异步调用 sendAction，不等待结果
        this.sendAction(action).catch(error => {
            logger.error('Error sending action:', error);
        });
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
2. ALWAYS include ALL required parameters, never skip required parameters
3. NEVER modify the tool names or parameter names
4. If a tool call fails, explain why and retry with corrected parameters
5. Only use tools that are explicitly provided in the list above
6. NEVER make up fake responses or tool results
7. NEVER write direct text responses - everything must be a tool call
8. Use replyUser or reassureUser for ALL communication with the user
9. When storing user data, maintain data integrity by preserving the original content exactly as provided - never modify or fabricate any part of user-provided information
10. NEVER refer to tool names when speaking to the USER
11. ALWAYS call the complete tool when you have finished handling the user's request and no further actions are needed
12. You can initiate multiple tool calls simultaneously - when appropriate, batch related operations together rather than executing them one by one

COMMUNICATION PRINCIPLES:
1. ALWAYS acknowledge the user's request immediately using reassureUser before starting any other operations ( tool call )
2. Provide regular progress updates during long-running operations to avoid leaving users waiting without explanation
3. Clearly explain your intent before starting complex operations
4. Confirm completion of tasks and summarize results when finished

TASK HANDLING PRINCIPLES:
1. For saving information:
   - Reassure the user about the action
   - Generate appropriate titles and tags based on content
   - Confirm successful storage with metadata
   
2. For answering questions:
   - Use semantic search (searchNotes) for natural language queries
   - Gather information from all relevant stored notes
   - Synthesize information from multiple sources
   - Provide context and sources in your answers
   - Suggest related information when appropriate

3. For user view note
   - If user intends to view a specific note, you can use the sendNote tool to send the content directly to the user, rather than view and reply

Remember: EVERY response must be a tool call. No direct text allowed. Always communicate your intent and progress to the user before and during tool calls to avoid leaving them waiting without explanation.`;
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
                // Execute all tool calls concurrently
                const toolPromises = toolCalls.map(async toolCall => {
                    const tool = this.toolMap.get(toolCall.toolName);
                    if (!tool) return null;
                    
                    const startTime = Date.now();
                    try {
                        const result = await tool.execute(toolCall.params);
                        const endTime = Date.now();
                        logger.debug(`${toolCall.toolName} execution complete in ${endTime - startTime}ms`, result);
                        
                        return { 
                            toolCall, 
                            result, 
                            isComplete: result === TASK_COMPLETE_SIGNAL 
                        };
                    } catch (error) {
                        logger.error(`Error executing tool ${toolCall.toolName}:`, error);
                        return { 
                            toolCall, 
                            result: `Error: ${error}`, 
                            isComplete: false 
                        };
                    }
                });
                
                const results = await Promise.all(toolPromises);
                
                // Process results in the original order
                let isTaskComplete = false;
                for (const result of results) {
                    if (!result) continue;
                    
                    if (result.isComplete) {
                        logger.info('Task complete signal received');
                        isTaskComplete = true;
                        break;
                    }
                    
                    // Add tool response to message history
                    messages.push({
                        role: "system",
                        content: `Tool result from ${result.toolCall.toolName}: ${JSON.stringify(result.result)}`
                    });
                }
                
                if (isTaskComplete) {
                    return;
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
