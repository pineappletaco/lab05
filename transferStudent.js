const pool = require('./db');

async function transferStudent(studentId, oldDeptId, newDeptId) {
    let conn;
    try {
        // 建立連接
        conn = await pool.getConnection();
        
        // 檢查學生是否存在
        const studentCheck = await conn.query(
            'SELECT * FROM STUDENT WHERE Student_ID = ?',
            [studentId]
        );
        
        if (studentCheck.length === 0) {
            console.log(`查無學生 ${studentId}，轉系處理中止`);
            return;
        }
        
        // 檢查系所是否存在
        const deptCheck = await conn.query(
            'SELECT * FROM DEPARTMENT WHERE Department_ID IN (?, ?)',
            [oldDeptId, newDeptId]
        );
        
        if (deptCheck.length !== 2) {
            console.log(`系所代碼錯誤，請確認 ${oldDeptId} 和 ${newDeptId} 皆存在`);
            return;
        }
        
        // 開始交易
        await conn.beginTransaction();
        console.log(`開始處理學生 ${studentId} 從 ${oldDeptId} 轉到 ${newDeptId} 的程序`);

        // 1. 更新學生所屬系所
        await conn.query(
            'UPDATE STUDENT SET Department_ID = ? WHERE Student_ID = ?',
            [newDeptId, studentId]
        );
        console.log(`1. 已更新學生系所為 ${newDeptId}`);

        // 2. 檢查 COURSE 表結構，找出必修課程的標記欄位
        const courseColumns = await conn.query("SHOW COLUMNS FROM COURSE");
        console.log("課程表欄位結構:");
        const courseColumnNames = courseColumns.map(col => col.Field);
        console.log(courseColumnNames);
        
        // 假設必修課標記可能是 Required, IsRequired, Is_Required 或 Mandatory
        let requiredFieldName = null;
        const possibleFieldNames = ['Required', 'IsRequired', 'Is_Required', 'Mandatory', 'Course_Type'];
        
        for (const fieldName of possibleFieldNames) {
            if (courseColumnNames.includes(fieldName)) {
                requiredFieldName = fieldName;
                break;
            }
        }
        
        if (!requiredFieldName) {
            console.log("無法找到必修課程標記欄位，將使用系所課程進行操作");
            
            // 2. 標記舊系所課程為「轉系退選」（不篩選必修）
            await conn.query(`
                UPDATE ENROLLMENT 
                SET Status = '轉系退選' 
                WHERE Student_ID = ? 
                AND Course_ID IN (
                    SELECT Course_ID FROM COURSE 
                    WHERE Department_ID = ?
                )
            `, [studentId, oldDeptId]);
            console.log(`2. 已將所有舊系所課程標記為「轉系退選」`);
            
            // 3. 加選新系所課程（不篩選必修）
            const newDeptCourses = await conn.query(`
                SELECT Course_ID 
                FROM COURSE 
                WHERE Department_ID = ?
            `, [newDeptId]);
            
            // 假設有個當前學期的 ID
            const currentSemester = '112-2';
            
            for (const course of newDeptCourses) {
                // 檢查是否已經選過這門課
                const existingEnrollment = await conn.query(`
                    SELECT * FROM ENROLLMENT 
                    WHERE Student_ID = ? AND Course_ID = ? AND Semester = ?
                `, [studentId, course.Course_ID, currentSemester]);
                
                if (existingEnrollment.length === 0) {
                    await conn.query(`
                        INSERT INTO ENROLLMENT (Student_ID, Course_ID, Semester, Status)
                        VALUES (?, ?, ?, '轉系加選')
                    `, [studentId, course.Course_ID, currentSemester]);
                }
            }
            console.log(`3. 已加選新系所課程`);
        } else {
            console.log(`找到必修課標記欄位: ${requiredFieldName}`);
            
            // 根據找到的欄位名稱動態構建 SQL 查詢
            const requiredValue = requiredFieldName === 'Course_Type' ? "'必修'" : "1";
            
            // 2. 標記舊系所必修課程為「轉系退選」
            const updateQuery = `
                UPDATE ENROLLMENT 
                SET Status = '轉系退選' 
                WHERE Student_ID = ? 
                AND Course_ID IN (
                    SELECT Course_ID FROM COURSE 
                    WHERE Department_ID = ? AND ${requiredFieldName} = ${requiredValue}
                )
            `;
            
            await conn.query(updateQuery, [studentId, oldDeptId]);
            console.log(`2. 已將舊系所必修課程標記為「轉系退選」`);
            
            // 3. 加選新系所必修課程
            const requiredCoursesQuery = `
                SELECT Course_ID 
                FROM COURSE 
                WHERE Department_ID = ? AND ${requiredFieldName} = ${requiredValue}
            `;
            
            const requiredCourses = await conn.query(requiredCoursesQuery, [newDeptId]);
            
            // 假設有個當前學期的 ID
            const currentSemester = '112-2';
            
            for (const course of requiredCourses) {
                // 檢查是否已經選過這門課
                const existingEnrollment = await conn.query(`
                    SELECT * FROM ENROLLMENT 
                    WHERE Student_ID = ? AND Course_ID = ? AND Semester = ?
                `, [studentId, course.Course_ID, currentSemester]);
                
                if (existingEnrollment.length === 0) {
                    await conn.query(`
                        INSERT INTO ENROLLMENT (Student_ID, Course_ID, Semester, Status)
                        VALUES (?, ?, ?, '轉系加選')
                    `, [studentId, course.Course_ID, currentSemester]);
                }
            }
            console.log(`3. 已加選新系所必修課程`);
        }

        // 4. 查詢結果顯示
        const studentInfo = await conn.query(`
            SELECT s.Student_ID, s.Name, d.Department_ID, d.Department_Name
            FROM STUDENT s
            JOIN DEPARTMENT d ON s.Department_ID = d.Department_ID
            WHERE s.Student_ID = ?
        `, [studentId]);
        
        const enrollmentInfo = await conn.query(`
            SELECT e.Course_ID, c.Course_Name, e.Status
            FROM ENROLLMENT e
            JOIN COURSE c ON e.Course_ID = c.Course_ID
            WHERE e.Student_ID = ?
            ORDER BY e.Status
        `, [studentId]);
        
        // 提交交易
        await conn.commit();
        console.log(`交易成功提交，學生 ${studentId} 已從 ${oldDeptId} 轉到 ${newDeptId}`);
        
        // 打印結果
        console.log('\n==== 轉系後學生資料 ====');
        console.log(`學號: ${studentInfo[0].Student_ID}`);
        console.log(`姓名: ${studentInfo[0].Name}`);
        console.log(`系所: ${studentInfo[0].Department_Name} (${studentInfo[0].Department_ID})`);
        
        console.log('\n==== 選課狀態 ====');
        for (const enrollment of enrollmentInfo) {
            console.log(`${enrollment.Course_ID} - ${enrollment.Course_Name}: ${enrollment.Status}`);
        }
        
    } catch (err) {
        if (conn) await conn.rollback();
        console.error('轉系處理失敗：', err);
    } finally {
        if (conn) conn.release();
    }
}

// 執行轉系功能
transferStudent('S10721001', 'EE001', 'CS001');