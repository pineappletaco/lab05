const pool = require('./db');

async function basicCrud() {
    let conn;
    try {
        conn = await pool.getConnection();

        // 1. INSERT 新增
        let sql = 'INSERT INTO STUDENT (Student_ID, Name, Gender, Email, Department_ID) VALUES (?, ?, ?, ?, ?)';
        await conn.query(sql, ['S10810001', '王曉明', 'M', 'wang@example.com', 'CS001']);
        console.log('已新增一筆學生資料');

        // 2. SELECT 查詢
        sql = 'SELECT * FROM STUDENT WHERE Department_ID = ?';
        const rows = await conn.query(sql, ['CS001']);
        console.log('查詢結果：', rows);

        // 3. UPDATE 更新
        sql = 'UPDATE STUDENT SET Name = ? WHERE Student_ID = ?';
        await conn.query(sql, ['王小明', 'S10810001']);
        console.log('已更新學生名稱');

        // 4. DELETE 刪除
        sql = 'DELETE FROM STUDENT WHERE Student_ID = ?';
        await conn.query(sql, ['S10810001']);
        console.log('已刪除該學生');
    } catch (err) {
        console.error('操作失敗：', err);
    } finally {
        if (conn) conn.release();
    }
}

basicCrud();