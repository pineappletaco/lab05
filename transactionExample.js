const pool = require('./db');

async function doTransaction(studentId, newDepartmentId) {
    let conn;
    try {
        conn = await pool.getConnection();

        // 先檢查學生是否存在
        const checkStudent = 'SELECT * FROM STUDENT WHERE Student_ID = ?';
        const studentResult = await conn.query(checkStudent, [studentId]);

        // 如果查無此學生，則中止操作
        if (studentResult.length === 0) {
            console.log(`查無學生 ${studentId}，交易中止`);
            return;
        }

        // 存儲原始系別資訊，用於顯示變更前後的對比
        const originalDepartment = studentResult[0].Department_ID;
        console.log(`學生 ${studentId} 原系別: ${originalDepartment}`);

        // 開始交易
        await conn.beginTransaction();
        console.log('交易開始');

        // 更新學生系別
        const updateStudent = 'UPDATE STUDENT SET Department_ID = ? WHERE Student_ID = ?';
        await conn.query(updateStudent, [newDepartmentId, studentId]);

        // 更新學生選課表中的系所標記
        const updateCourses = 'UPDATE ENROLLMENT SET Status = ? WHERE Student_ID = ?';
        await conn.query(updateCourses, ['轉系', studentId]);

        // 提交交易
        await conn.commit();
        console.log('交易成功，已提交');

        // 交易完成後查詢更新後的學生資料
        const updatedStudentQuery = 'SELECT s.Student_ID, s.Name, s.Department_ID, d.Department_Name ' +
            'FROM STUDENT s ' +
            'JOIN DEPARTMENT d ON s.Department_ID = d.Department_ID ' +
            'WHERE s.Student_ID = ?';
        const updatedResult = await conn.query(updatedStudentQuery, [studentId]);

        if (updatedResult.length > 0) {
            const student = updatedResult[0];
            console.log('更新後的學生資料:');
            console.log(`學號: ${student.Student_ID}`);
            console.log(`姓名: ${student.Name}`);
            console.log(`系別代碼: ${student.Department_ID}`);
            console.log(`系別名稱: ${student.Department_Name}`);
            console.log(`系別變更: ${originalDepartment} -> ${student.Department_ID}`);
        }
    } catch (err) {
        // 如果有任何錯誤，回滾所有操作
        if (conn) await conn.rollback();
        console.error('交易失敗，已回滾：', err);
    } finally {
        if (conn) conn.release();
    }
}

// 使用方式：提供學號和新系別代碼
const studentId = 'S10810005';  // 要修改的學生學號
const newDepartmentId = 'EE001'; // 新的系別代碼

doTransaction(studentId, newDepartmentId);