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

        // 檢查 ENROLLMENT 表的 Status 欄位允許的值
        console.log("檢查 ENROLLMENT 表的 Status 欄位約束條件...");
        let allowedStatusValues = [];

        try {
            // 嘗試查詢 Status 欄位的結構資訊
            const statusColumnInfo = await conn.query(`
                SHOW COLUMNS FROM ENROLLMENT WHERE Field = 'Status'
            `);

            if (statusColumnInfo.length > 0 && statusColumnInfo[0].Type.startsWith('enum')) {
                // 從 ENUM 定義中解析出允許的值
                const enumDef = statusColumnInfo[0].Type;
                const matches = enumDef.match(/enum\('([^']*)'(?:,'([^']*)')*\)/);
                if (matches) {
                    allowedStatusValues = matches.slice(1).filter(Boolean);
                    console.log("Status 欄位允許的值:", allowedStatusValues);
                }
            } else {
                console.log("Status 欄位不是 ENUM 類型或查詢失敗");
            }
        } catch (err) {
            console.log("無法獲取 Status 欄位的約束條件:", err.message);
        }

        // 如果找不到允許的值或列表為空，使用預設值
        // 如果找不到允許的值或列表為空，使用資料表允許的值
        // 如果找不到允許的值或列表為空，使用資料表允許的值
        // 如果找不到允許的值或列表為空，使用資料表約束的值
        if (allowedStatusValues.length === 0) {
            allowedStatusValues = ['修課中', '通過', '不通過', '退選'];
            console.log("使用資料表約束的 Status 值:", allowedStatusValues);
        }

        // 檢查並設置轉系狀態值
        let transferDropStatus = '退選';  // 對應退選
        let transferAddStatus = '修課中'; // 對應加選（初始狀態）

        for (const status of allowedStatusValues) {
            if (status === '退選') {
                transferDropStatus = status;
            }
            if (status === '修課中') {
                transferAddStatus = status;
            }
        }

        console.log(`將使用 "${transferDropStatus}" 作為轉系退選狀態`);
        console.log(`將使用 "${transferAddStatus}" 作為轉系加選狀態`);
        // 開始交易
        await conn.beginTransaction();
        console.log(`開始處理學生 ${studentId} 從 ${oldDeptId} 轉到 ${newDeptId} 的程序`);

        // 1. 更新學生所屬系所
        await conn.query(
            'UPDATE STUDENT SET Department_ID = ? WHERE Student_ID = ?',
            [newDeptId, studentId]
        );
        console.log(`1. 已更新學生系所為 ${newDeptId}`);

        // 2. 檢查 COURSE 表結構
        const courseColumns = await conn.query("SHOW COLUMNS FROM COURSE");
        console.log("課程表欄位結構:");
        const courseColumnNames = courseColumns.map(col => col.Field);
        console.log(courseColumnNames);

        // 查找必修課欄位
        let requiredFieldName = null;
        let requiredValue = null;

        // 檢查是否有 Required 或 Course_Type 欄位
        if (courseColumnNames.includes('Required')) {
            requiredFieldName = 'Required';
            requiredValue = "1";
        } else if (courseColumnNames.includes('IsRequired')) {
            requiredFieldName = 'IsRequired';
            requiredValue = "1";
        } else if (courseColumnNames.includes('Is_Required')) {
            requiredFieldName = 'Is_Required';
            requiredValue = "1";
        } else if (courseColumnNames.includes('Course_Type')) {
            // 檢查 Course_Type 可能的值
            const courseTypeValues = await conn.query(`
                SELECT DISTINCT Course_Type FROM COURSE
            `);
            console.log("Course_Type 可能的值:", courseTypeValues.map(row => row.Course_Type));

            // 檢查是否有包含"必修"的值
            for (const row of courseTypeValues) {
                if (row.Course_Type && row.Course_Type.includes('必修')) {
                    requiredFieldName = 'Course_Type';
                    requiredValue = `'${row.Course_Type}'`;
                    break;
                }
            }
        }

        console.log(`必修課欄位檢查結果: ${requiredFieldName ? requiredFieldName + ' = ' + requiredValue : '未找到必修課欄位'}`);

        // 2. 標記舊系所課程為退選
        let updateQuery;
        if (requiredFieldName && requiredValue) {
            // 只標記必修課
            updateQuery = `
                UPDATE ENROLLMENT 
                SET Status = ? 
                WHERE Student_ID = ? 
                AND Course_ID IN (
                    SELECT Course_ID FROM COURSE 
                    WHERE Department_ID = ? AND ${requiredFieldName} = ${requiredValue}
                )
            `;
            await conn.query(updateQuery, [transferDropStatus, studentId, oldDeptId]);
            console.log(`2. 已將舊系所必修課程標記為「${transferDropStatus}」`);
        } else {
            // 標記所有舊系所課程
            updateQuery = `
                UPDATE ENROLLMENT 
                SET Status = ? 
                WHERE Student_ID = ? 
                AND Course_ID IN (
                    SELECT Course_ID FROM COURSE 
                    WHERE Department_ID = ?
                )
            `;
            await conn.query(updateQuery, [transferDropStatus, studentId, oldDeptId]);
            console.log(`2. 已將所有舊系所課程標記為「${transferDropStatus}」`);
        }

        // 3. 加選新系所課程
        let courseQuery;
        if (requiredFieldName && requiredValue) {
            // 只加選必修課
            courseQuery = `
                SELECT Course_ID 
                FROM COURSE 
                WHERE Department_ID = ? AND ${requiredFieldName} = ${requiredValue}
            `;
        } else {
            // 加選所有課程
            courseQuery = `
                SELECT Course_ID 
                FROM COURSE 
                WHERE Department_ID = ?
            `;
        }

        const newCourses = await conn.query(courseQuery, [newDeptId]);

        // 假設有個當前學期的 ID
        const currentSemester = '112-2';

        let addedCount = 0;
        for (const course of newCourses) {
            // 檢查是否已經選過這門課
            const existingEnrollment = await conn.query(`
                SELECT * FROM ENROLLMENT 
                WHERE Student_ID = ? AND Course_ID = ? AND Semester_ID = ?
            `, [studentId, course.Course_ID, currentSemester]);

            if (existingEnrollment.length === 0) {
                // 使用當前日期作為 Enrollment_Date
                const currentDate = new Date().toISOString().split('T')[0]; // 獲取當前日期，例如 '2025-05-08'
                await conn.query(`
                    INSERT INTO ENROLLMENT (Student_ID, Course_ID, Semester_ID, Enrollment_Date, Status)
                    VALUES (?, ?, ?, ?, ?)
                `, [studentId, course.Course_ID, currentSemester, currentDate, transferAddStatus]);
                addedCount++;
            }
        }

        if (requiredFieldName && requiredValue) {
            console.log(`3. 已加選 ${addedCount} 門新系所必修課程`);
        } else {
            console.log(`3. 已加選 ${addedCount} 門新系所課程`);
        }

        // 4. 查詢結果顯示
        // 4. 查詢結果顯示
        const studentInfo = await conn.query(`
    SELECT s.Student_ID, s.Name AS Student_Name, d.Department_ID, d.Name AS Department_Name
    FROM STUDENT s
    JOIN DEPARTMENT d ON s.Department_ID = d.Department_ID
    WHERE s.Student_ID = ?
`, [studentId]);

        const enrollmentInfo = await conn.query(`
            SELECT e.Course_ID, c.Title as Course_Name, e.Status
            FROM ENROLLMENT e
            JOIN COURSE c ON e.Course_ID = c.Course_ID
            WHERE e.Student_ID = ?
            ORDER BY e.Status
        `, [studentId]);

        // 提交交易
        await conn.commit();
        console.log(`交易成功提交，學生 ${studentId} 已從 ${oldDeptId} 轉到 ${newDeptId}`);

        // 打印結果
        // 打印結果
        // 打印結果
        console.log('\n==== 轉系後學生資料 ====');
        console.log(`學號: ${studentInfo[0].Student_ID}`);
        console.log(`姓名: ${studentInfo[0].Student_Name}`);
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
// 請修改以下參數為您要轉系的學生學號、原系所及新系所
transferStudent('S10721001', 'CS001', 'EE001');