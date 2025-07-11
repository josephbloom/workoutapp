const mysql = require('mysql2/promise')

const exerciseSqlCreds = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER_EXERCISE,
    password: process.env.MYSQL_PASSWORD_EXERCISE,
    database: process.env.MYSQL_DATABASE_EXERCISE,
    timezone: process.env.MYSQL_TIMEZONE
}

async function newEntry(payload) {

    let result
    const con = await mysql.createConnection(exerciseSqlCreds)
    
    if (payload.new == "set") {
        const insertResults = (await con.execute(`INSERT INTO sets (exercise_id, notes) VALUES (?,"")`,[payload.eid]))[0]
        console.log(insertResults)
        const selectSets = (await con.execute(`select * from sets where id = ?`, [insertResults.insertId]))[0]
        const selectExercises = (await con.execute(`SELECT set_ids, workout_id from exercises where id = ?`, [payload.eid]))[0]
        await con.end()
        const updateResults = updateEntry({update: 'exercises', fields: {set_ids: JSON.stringify(selectExercises[0].set_ids.concat([insertResults.insertId]))}, id: payload.eid})
        console.log(updateResults)
        result = {
            result: true,
            data : {
                "eid":payload.eid,
                "set_id": insertResults.insertId,
                "workout_id": selectExercises[0].workout_id,
                "set": selectSets[0]
            }
        }

    } else if (payload.new == "exercise") {
        const exerciseSql = `INSERT INTO exercises (movement_id, workout_id, set_ids) VALUES (?, ?, "[]")`;
        const insertResults = (await con.execute(exerciseSql, [payload.movementId, payload.workoutId]))[0]
        console.log(insertResults)
        console.log(insertResults.insertId)

        let newExerciseIds
        payload.currentExercises ? newExerciseIds = payload.currentExercises.concat([insertResults.insertId]) : newExerciseIds = [insertResults.insertId]
        console.log(newExerciseIds)
        console.log(JSON.stringify(newExerciseIds))
        const updateResults = updateEntry({update: 'workouts', fields: {exercise_ids: JSON.stringify(newExerciseIds)}, id: payload.workoutId})
        console.log(updateResults)
        result = {result: true, data: (await con.execute('select * from exercises where id = ?',[insertResults.insertId]))[0][0]}

    } else if (payload.new == "workout") {
        await con.execute(`insert into workouts (name, exercise_ids, notes) VALUES (?,"[]","")`,[payload.name])
        const newWorkoutEntry = (await con.execute('select * from workouts order by id desc limit 1'))[0][0]
        newWorkoutEntry.date = newWorkoutEntry.date.toISOString()
        result = {result: true, data: newWorkoutEntry}

    } else if (payload.new == "movement") {
        console.log(payload)
        payload.alternative_names = payload.alternative_names.filter((m) => m !== '')
        let values = [payload.name, payload.alternative_names, payload.target, payload.type, payload.notes]
        const sql = `INSERT INTO movements (name,alternative_names,target,type,notes) VALUES (?, ?, ?, ?, ?)`;
        const con = await mysql.createConnection(exerciseSqlCreds)
        // console.log(sql,values)
        await con.execute(sql,values)
        result = {result: true, data: (await con.execute('select * from movements order by name'))[0]}
    }
    await con.end()
    console.log(result)
    return result
}

async function deleteEntry(payload) {

    const errObj = {result: false, data: "bad format"}
    console.log(payload)

    if (typeof(payload) !== "object") return errObj
    const payloadKeys = Object.keys(payload)
    if (payloadKeys.length !== 2 || !payloadKeys.includes('delete') || !payloadKeys.includes('id')) return errObj
    if (!/\d+/.test(String(payload.id))) return errObj
    if (!['exercise','set','workout','movement'].includes(payload.delete)) return errObj

    const con = await mysql.createConnection(exerciseSqlCreds)
    let result
    if (payload.delete == "set") {
        try {
            const sid = payload.id
            const eid = (await con.execute(`SELECT exercise_id FROM sets WHERE id = ?`,[sid]))[0][0].exercise_id
            const setIds = (await con.execute(`SELECT set_ids FROM exercises where id = ?`,[eid]))[0][0].set_ids
            setIds.splice(setIds.indexOf(sid),1)
            deleteResults = await con.execute(`DELETE FROM sets WHERE id = ?`, [sid])
            updateEntry({update: "exercises", fields: {set_ids: JSON.stringify(setIds)}, id: eid})
            result = {result: true, data: {sid: sid, eid: eid}}
        } catch (err) {
            result = {result: false, error: err}
        }
    } else if (payload.delete == "exercise") {
        console.log('deleting exercise')
        const eid = payload.id
        const {wid,set_ids} = (await con.execute(`SELECT workout_id as wid, set_ids FROM exercises WHERE id = ?`,[eid]))[0][0]
        const exercise_ids = (await con.execute(`select exercise_ids from workouts where id = ?`,[wid]))[0][0].exercise_ids
        console.log("wid ",wid)
        console.log('set ids ',set_ids)
        console.log("exercise ids ", exercise_ids)

        exercise_ids.splice(exercise_ids.indexOf(eid),1)

        console.log('new exercise ids ',exercise_ids)

        if (set_ids.length > 0) await con.execute(`delete from sets where id in (${set_ids.map(() => "?").join()})`, set_ids)
        await con.execute(`delete from exercises where id = ?`, [eid])
        updateEntry({update: "workouts", fields: {exercise_ids: JSON.stringify(exercise_ids)}, id: wid})
        result = {result: true, data: {set_ids: set_ids, eid: eid, wid: wid, exercise_ids: exercise_ids}}

    } else if (payload.delete == "workout") {
        const wid = payload.id
        let [exercise_ids,set_ids] = [[],[]]
        exercise_ids = (await con.execute('select id from exercises where workout_id = ?',[wid]))[0].map((r) => r.id)
        if (exercise_ids.length > 0) {
            set_ids = (await con.execute(
                `select id from sets where exercise_id in (${exercise_ids.map(() => "?").join()})`,exercise_ids
            ))[0].map((r) => r.id)
            console.log(payload)
            if (set_ids.length > 0) await con.execute(`delete from sets where id in (${set_ids.map(() => "?").join()})`, set_ids)
            await con.execute(`delete from exercises where id in (${exercise_ids.map(() => "?").join()})`, exercise_ids)
        }
        await con.execute(`delete from workouts where id = ?`, [wid])
        result = {result: true, data: {workoutId: wid, setIds: set_ids, exerciseIds: exercise_ids}}
    }
    await con.end()
    console.log('done deleting')
    console.log(result)
    return result
}

async function updateEntry(payload) {
    const errObj = (e) => {return {result: false, data: e}}
    let update = String(payload.update)
    let id = String(payload.id)
    let middleSql = []
    let values = []

    console.log("running updateEntry")
    console.log(payload)

    if (!/\d+/.test(id)) return errObj("bad id")
    if (!["exercises","workouts","movements","sets"].includes(update)) return errObj("bad update")

    for (let field in payload.fields) {
        field = String(field)
        let value = typeof(payload.fields[field]) === "object" ? JSON.stringify(payload.fields[field]) : String(payload.fields[field])

        if (
               (update === "workouts" && !['name','date','exercise_ids','notes'].includes(field))
            || (update === "exercises" && !['movement_id','workout_id','set_ids','set_type','notes'].includes(field))
            || (update === "sets" && !['exercise_id','weight','reps','reps_right','reps_left','myo_reps','myoreps_right','myoreps_left','dropped_weight','dropped_reps','dropped_reps_right','dropped_reps_left','notes'].includes(field))
            || (update === "movements" && !['name','alternative_names','type','target','notes'].includes(field))
        ) return errObj("bad field")

        // if (['exercise_id','movement_id','workout_id'].includes(field) && !/\d*/.test(field)) return errObj("bad value")
        // else if ([].includes(field) && !/\d{4}/)

        if (update === "sets" && field !== "notes" && value === "") value = null
        middleSql.push(field+" = ?")
        values.push(payload.fields[field])
    }
    values.push(id)

    const sql = `update ${update} set ${middleSql.join(", ")} where id = ?`
    console.log(sql, values)

    const con = await mysql.createConnection(exerciseSqlCreds)
    await con.execute(sql,values)
    await con.end()

    return {result: true, data: payload}
}

module.exports = {
    newEntry,
    updateEntry,
    deleteEntry
}