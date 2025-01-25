import { Note } from '../types';

describe('Note JSON Serialization', () => {
    const testNotes: Note[] = [
        {
            title: "Chocolate Cake Recipe",
            tags: ["recipe", "dessert", "chocolate cake"],
            content: "Mix flour, sugar, and cocoa powder...",
            createdAt: "2025-01-25T06:40:50.191Z"
        },
        {
            title: "代办事项: 坐飞机",
            tags: ["代办事项", "飞机"],
            content: "订机票，准备护照...",
            createdAt: "2025-01-25T06:55:37.869Z"
        },
        {
            title: "菜谱: 番茄炒鸡蛋",
            tags: ["菜谱", "番茄炒鸡蛋", "简单", "美味", "新手"],
            content: `帮我记录一个菜谱: 番茄炒鸡蛋
材料：鸡蛋3个，番茄2个，盐少许，葱花适量。
做法：
番茄切块，鸡蛋加盐打散。
锅中加油，倒入鸡蛋液，炒成小块盛出。
锅中加油，放入番茄块，加盐炒至出汁。
倒入炒好的鸡蛋，翻炒均匀，撒葱花即可出锅。
简单又美味，适合新手。`,
            createdAt: "2025-01-25T06:58:23.112Z"
        }
    ];

    it('should maintain data integrity through JSON stringify and parse', () => {
        testNotes.forEach(originalNote => {
            // Convert to JSON string
            const jsonString = JSON.stringify(originalNote);

            console.log(jsonString);
            
            // Parse back to object
            const parsedNote = JSON.parse(jsonString) as Note;
            
            // Compare all properties
            expect(parsedNote.title).toBe(originalNote.title);
            expect(parsedNote.content).toBe(originalNote.content);
            expect(parsedNote.createdAt).toBe(originalNote.createdAt);
            expect(parsedNote.tags).toEqual(originalNote.tags);
            
            // Compare full objects
            expect(parsedNote).toEqual(originalNote);
            
            // Verify the second stringify matches the first
            expect(JSON.stringify(parsedNote)).toBe(jsonString);
        });
    });

    it('should handle special characters correctly', () => {
        const noteWithSpecialChars: Note = {
            title: "特殊字符测试：！@#￥%",
            tags: ["测试", "特殊", "字符！@#"],
            content: "包含特殊字符：\n换行\t制表符\"引号'单引号'",
            createdAt: "2025-01-25T06:58:23.112Z"
        };

        const jsonString = JSON.stringify(noteWithSpecialChars);
        const parsedNote = JSON.parse(jsonString) as Note;

        expect(parsedNote).toEqual(noteWithSpecialChars);
        expect(parsedNote.content).toBe(noteWithSpecialChars.content);
    });

    it('should maintain array order in tags', () => {
        const noteWithManyTags: Note = {
            title: "Test Tags Order",
            tags: ["1", "2", "3", "4", "5", "一", "二", "三"],
            content: "Testing tag order preservation",
            createdAt: "2025-01-25T06:58:23.112Z"
        };

        const jsonString = JSON.stringify(noteWithManyTags);
        const parsedNote = JSON.parse(jsonString) as Note;

        expect(parsedNote.tags).toEqual(noteWithManyTags.tags);
        expect(parsedNote.tags.join()).toBe(noteWithManyTags.tags.join());
    });
});