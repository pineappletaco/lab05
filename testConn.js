const pool = require('./db');

async function testConnection() {
    let conn;
    try {
        conn = await pool.getConnection();
        console.log('資料庫連線成功！');
    } catch (err) {
        console.error('資料庫連線失敗：', err);
    } finally {
        if (conn) conn.release(); // 釋放連線回到連線池
    }
}

testConnection();