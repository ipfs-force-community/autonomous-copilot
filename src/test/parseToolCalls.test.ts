import { describe, expect, test } from '@jest/globals';
import { parseToolCalls } from '../services/agent';

describe('parseToolCalls', () => {
    test('应该正确解析单个工具调用', () => {
        const input = '<call>search(query="测试")</call>';
        const result = parseToolCalls(input);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            toolName: 'search',
            params: {
                query: '测试'
            }
        });
    });

    test('应该正确解析多个工具调用', () => {
        const input = '<call>tool1(param="value1")</call><call>tool2(param="value2")</call>';
        const result = parseToolCalls(input);

        expect(result).toHaveLength(2);
        expect(result[0]).toEqual({
            toolName: 'tool1',
            params: {
                param: 'value1'
            }
        });
        expect(result[1]).toEqual({
            toolName: 'tool2',
            params: {
                param: 'value2'
            }
        });
    });

    test('应该正确解析带数组参数的工具调用', () => {
        const input = '<call>list(tags="tag1,tag2,tag3")</call>';
        const result = parseToolCalls(input);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            toolName: 'list',
            params: {
                tags: ['tag1', 'tag2', 'tag3']
            }
        });
    });

    test('应该正确处理空字符串', () => {
        const result = parseToolCalls('');
        expect(result).toHaveLength(0);
    });

    test("可以处理复杂的调用", () => {
        const call = `<call>saveNote(title=\"番茄炒鸡蛋食谱\", content=\"### **番茄炒鸡蛋食谱**\n\n#### **材料：**\n- 鸡蛋：3个  \n- 番茄：2个（中等大小）  \n- 盐：适量（约1茶匙）  \n- 糖：少许（可选，用于提鲜）  \n- 葱：1根（切末，用于装饰）  \n- 食用油：适量（约2汤匙）  \n- 鸡精或味精：少许（可选）\n\n#### **步骤：**\n1. **准备食材**  \n   - 番茄洗净，切成小块。  \n   - 鸡蛋打入碗中，加入少许盐，用筷子打散。  \n   - 葱切成葱花备用。\n\n2. **炒鸡蛋**  \n   - 锅中加入适量油，油热后倒入鸡蛋液。  \n   - 待鸡蛋液开始凝固时，用铲子轻轻翻炒，将鸡蛋炒成小块，盛出备用。\n\n3. **炒番茄**  \n   - 锅中加入适量油，放入番茄块，加入少许盐，中小火翻炒。  \n   - 番茄炒至出汁后，加入少许糖（可选），继续翻炒，让番茄更加软糯。\n\n4. **混合炒制**  \n   - 将炒好的鸡蛋倒回锅中，与番茄一起翻炒均匀。  \n   - 根据口味调整盐的量，加入少许鸡精或味精（可选）提鲜。\n\n5. **出锅装盘**  \n   - 炒好的番茄炒鸡蛋盛入盘中，撒上葱花点缀即可。\n\n---\n\n### **小贴士：**\n- **番茄的选择**：选择熟透的番茄，这样炒出来的番茄汁更多，口感更好。  \n- **鸡蛋的炒法**：鸡蛋不要炒得太老，稍微凝固即可盛出，这样口感更嫩。  \n- **糖的作用**：加入少许糖可以中和番茄的酸味，让菜肴更加鲜美。如果不习惯可以省略。  \n- **火候控制**：番茄炒的时候用中小火，避免炒焦。\", tags=\"食谱, 烹饪\")</call>`;
        expect(parseToolCalls(call)[0]).toEqual([{
            toolName: 'saveNote',
            params: {
                title: "番茄炒鸡蛋食谱",
                content: "### **番茄炒鸡蛋食谱**\n\n#### **材料：**\n- 鸡蛋：3个  \n- 番茄：2个（中等大小）  \n- 盐：适量（约1茶匙）  \n- 糖：少许（可选，用于提鲜）  \n- 葱：1根（切末，用于装饰）  \n- 食用油：适量（约2汤匙）  \n- 鸡精或味精：少许（可选）\n\n#### **步骤：**\n1. **准备食材**  \n   - 番茄洗净，切成小块。  \n   - 鸡蛋打入碗中，加入少许盐，用筷子打散。  \n   - 葱切成葱花备用。\n\n2. **炒鸡蛋**  \n   - 锅中加入适量油，油热后倒入鸡蛋液。  \n   - 待鸡蛋液开始凝固时，用铲子轻轻翻炒，将鸡蛋炒成小块，盛出备用。\n\n3. **炒番茄**  \n   - 锅中加入适量油，放入番茄块，加入少许盐，中小火翻炒。  \n   - 番茄炒至出汁后，加入少许糖（可选），继续翻炒，让番茄更加软糯。\n\n4. **混合炒制**  \n   - 将炒好的鸡蛋倒回锅中，与番茄一起翻炒均匀。  \n   - 根据口味调整盐的量，加入少许鸡精或味精（可选）提鲜。\n\n5. **出锅装盘**  \n   - 炒好的番茄炒鸡蛋盛入盘中，撒上葱花点缀即可。\n\n---\n\n### **小贴士：**\n- **番茄的选择**：选择熟透的番茄，这样炒出来的番茄汁更多，口感更好。  \n- **鸡蛋的炒法**：鸡蛋不要炒得太老，稍微凝固即可盛出，这样口感更嫩。  \n- **糖的作用**：加入少许糖可以中和番茄的酸味，让菜肴更加鲜美。如果不习惯可以省略。  \n- **火候控制**：番茄炒的时候用中小火，避免炒焦。",
                tags: ["食谱", "烹饪"]
            }
        }]);
    });
});
