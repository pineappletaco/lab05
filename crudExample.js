const pool = require('./db');

async function basicCrud() {
    let conn;
    try {
        conn = await pool.getConnection();

        // Helper function to check if student ID exists
        async function checkStudentExists(studentId) {
            const sql = 'SELECT COUNT(*) as count FROM STUDENT WHERE Student_ID = ?';
            const result = await conn.query(sql, [studentId]);
            return result[0].count > 0;
        }

        // 1. INSERT 新增 - 檢查學號是否已存在
        const newStudentId = 'S10810001';
        if (await checkStudentExists(newStudentId)) {
            console.log(`學號 ${newStudentId} 已存在，無法新增`);
        } else {
            let sql = 'INSERT INTO STUDENT (Student_ID, Name, Gender, Email, Department_ID) VALUES (?, ?, ?, ?, ?)';
            await conn.query(sql, [newStudentId, '王曉明', 'M', 'wang@example.com', 'CS001']);
            console.log(`已新增學生 ${newStudentId} 的資料`);
        }

        // 2. SELECT 查詢
        let sql = 'SELECT * FROM STUDENT WHERE Department_ID = ?';
        const rows = await conn.query(sql, ['CS001']);
        console.log('查詢結果：', rows);

        // 3. UPDATE 更新 - 檢查學號是否存在
        if (!(await checkStudentExists(newStudentId))) {
            console.log(`學號 ${newStudentId} 不存在，無法更新`);
        } else {
            sql = 'UPDATE STUDENT SET Name = ? WHERE Student_ID = ?';
            await conn.query(sql, ['王小明', newStudentId]);
            console.log(`已更新學生 ${newStudentId} 的名稱`);
        }

        // 4. DELETE 刪除 - 檢查學號是否存在
        if (!(await checkStudentExists(newStudentId))) {
            console.log(`學號 ${newStudentId} 不存在，無法刪除`);
        } else {
            sql = 'DELETE FROM STUDENT WHERE Student_ID = ?';
            await conn.query(sql, [newStudentId]);
            console.log(`已刪除學生 ${newStudentId}`);
        }
    } catch (err) {
        console.error('操作失敗：', err);
    } finally {
        if (conn) conn.release();
    }
}