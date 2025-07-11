const mysql = require('mysql2/promise')
const argon2 = require('argon2')

const loginSqlCreds = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER_LOGIN,
    password: process.env.MYSQL_PASSWORD_LOGIN,
    database: process.env.MYSQL_DATABASE_LOGIN,
    timezone: process.env.MYSQL_TIMEZONE
}


const loginProcess = async (body, response) => {

    const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890-_+.,!@#$%^&*()[]{}|?<>"

    // await argon2.hash("aaaaa")
    let payload
    try {
        payload = JSON.parse(body)
    } catch (err) {
        console.error("received login body that was not an object")
        console.log(body)
        response.writeHead(400, {'Content-Type': 'application/json'})
        response.write(JSON.stringify({result: false, error: "malformed request"}))
        response.end()
        return
    }
    // type of undefined is 'undefined' so if username or password are missing from keys, error will be returned
    if (Object.keys(payload).length !== 2 || typeof(payload.username) !== "string" || typeof(payload.password) !== "string") {
        console.error("credentials not strings")
        response.writeHead(400, {'Content-Type': 'application/json'})
        response.write(JSON.stringify({result: false, error: "malformed request"}))
        response.end()
        return
    }
    const con = await mysql.createConnection(loginSqlCreds)
    const rows = (await con.execute(`select id, hash, attempts from users where username = ?`,[payload.username.toLowerCase()]))[0]
    if (rows.length !== 1) {
        con.end()
        console.error("invalid credentials, bad username")
        response.writeHead(401, {'Content-Type': 'application/json'})
        response.write(JSON.stringify({result: false, error: "invalid credentials"}))
        response.end()
        return
    }
    // console.log(rows)
    const {id: userId, hash, attempts} = rows[0]
    if (attempts > 4) {
        console.error("bad attempt threshold met for "+payload.username)
        response.writeHead(401, {'Content-Type': 'application/json'})
        response.write(JSON.stringify({result: false, error: "exceeded attempt threshold"}))
    } else if (await argon2.verify(hash,payload.password)) {
        console.log("successful login by "+payload.username)
        const newSession = Array(100).fill().map(() => { return chars[Math.floor(Math.random() * (chars.length-1))] }).join('')
        await con.execute(`update users set attempts = 0 where id = ?`, [userId])
        await con.execute(
            `insert into sessions (user_id, session_id, session_expiration) values (?,?,?)`,
            [userId, newSession, new Date().toISOString()]
        )
        response.setHeader("set-cookie",[
            `session=${btoa(newSession)}; secure; httponly`
        ])
        response.writeHead(200, {'Content-Type': 'application/json'})
        response.write(JSON.stringify({result: true, redirect: "/"}))
    } else {
        await con.execute(`update users set attempts = ? where id = ?`,[(attempts+1),userId])
        console.error("invalid credentials for "+payload.username)
        response.writeHead(401, {'Content-Type': 'application/json'})
        response.write(JSON.stringify({result: false, error: "invalid credentials"}))
    }
    await con.end()
    response.end()
    return
}

const cookieValidation = async (request) => {
    let cookies = {}
    let validSessionCookie = false
    if (request.headers.cookie) {
        // console.log('checking cookies')
        request.headers.cookie.split(";").forEach((c) => { c = c.trim().split('='); cookies[[c[0]]] = c[1]})
        if (cookies.session) {
            // console.log('found session cookie')
            let sessionId
            try {
                sessionId = atob(cookies.session)
            } catch (err) {
                console.log(err)
                console.log(cookies.session)
                return false
            }
            // console.log('session id is '+sessionId)
            const con = await mysql.createConnection(loginSqlCreds)
            const rows = (await con.execute("select session_expiration from sessions where session_id = ?",[sessionId]))[0]
            con.end()

            // console.log(rows)

            if (rows.length === 1) {
                // getTime() returns milliseconds, add 1000 to timeLimit
                const rightNow = new Date().getTime()
                const sessionTime = new Date(rows[0].session_expiration).getTime()
                const timeLimit = 1000*60*60*24*process.env.SESSION_TIME_LIMIT
                const sessionNotExpired = (rightNow - sessionTime) < timeLimit
                if (sessionNotExpired) validSessionCookie = true
            }
        }
    }
    return validSessionCookie
}

module.exports = {
    loginProcess,
    cookieValidation
}