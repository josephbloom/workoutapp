const dotenv = require('dotenv').config() // for .env file
const fs = require('fs')
const mysql = require('mysql2/promise')
const rp = require('./RenderPage.js')
const sessionsProcess = require('./loginProcess.js')
const dbService = require('./DBService.js')

const exerciseSqlCreds = {
    host: process.env.MYSQL_HOST,
    user: process.env.MYSQL_USER_EXERCISE,
    password: process.env.MYSQL_PASSWORD_EXERCISE,
    database: process.env.MYSQL_DATABASE_EXERCISE,
    timezone: process.env.MYSQL_TIMEZONE
}

let http
const options = {}

if (process.env.DEV === "true") {
    http = require('http')
    console.log("DEVMODE is ON. HTTPS is not being used.")
} else {
    http = require("https")
    options.key = fs.readFileSync('keys/private-key.pem')
    options.cert = fs.readFileSync('keys/certificate.pem')
    console.log("DEVMODE is OFF. HTTPS is being used.")
}


http.createServer(options, async function (request, response) {

    const remoteIP = request.socket.remoteAddress
    const xForwardedIP = request.headers['x-forwarded-for']

    console.log(`\n---- RemoteIP[${remoteIP}]${xForwardedIP ? "(x-forwarded-for: "+xForwardedIP+")": ""} requested ${request.method} ${request.url} ---- `)
    if (request.url === "/") {
        // console.log(request)
        // console.log(response)
        // console.log(request.headers)
        // console.log(request.headers['user-agent'])
        // console.log(request.headers.accept)
        // console.log(request.headers.cookie)
    }

    const validSessionCookie = await sessionsProcess.cookieValidation(request)
    // console.log("valid session cookie found ",validSessionCookie)
    
    if (!(["/login","/favicon.ico"].includes(request.url)) && !validSessionCookie) {
        response.setHeader("Location","/login")
        response.writeHead(303, {'Content-Type': 'application/json'})
        response.end()
        return
    } else if (request.url === "/login" && validSessionCookie) {
        response.setHeader("Location","/")
        response.writeHead(303, {'Content-Type': 'application/json'})
        response.end()
        return
    }

    if (request.method == 'GET') {
        if (request.url === "/login") {
            response.writeHead(200, {'Content-Type': 'text/html'})
            response.write(fs.readFileSync("templates/login.html", "utf8"))
            response.end()
        } else if (request.url == "/favicon.ico") {
            response.writeHead(404)
            response.end()
        } else if (/\/?img\//.test(request.url)) {
            const fileName = request.url.replace(/\/?img\//,"")
            const filesList = fs.readdirSync("img")
            if (filesList.includes(fileName)) {
                response.writeHead(200, {"Content-Type":"image/svg+xml"})
                response.write(fs.readFileSync("img/"+fileName, "utf8"))
                response.end()
            } else {
                response.writeHead(404, {"Content-Type":"text/plain"})
                response.end()
            }
        } else if (request.url == "/getmovementlist") {
            const con = await mysql.createConnection(exerciseSqlCreds)
            const rows = (await con.execute('select * from movements order by name'))[0]
            await con.end()
            console.log(rows)
            response.writeHead(200, {'Content-Type': 'application/json'})
            response.write(JSON.stringify(rows))
            response.end()
        } else if (request.url == "/") {
            rp.readIndex("./templates/index.html", response)
        } else if (request.url == "/getworkouts") {
            const con = await mysql.createConnection(exerciseSqlCreds)

            // get all workouts
            const workouts = (await con.execute('select * from workouts order by date desc'))[0]

            // collect workout exercise IDs
            const exercise_ids = []
            for (let w of workouts) {
                // change workout dates from Date objects to iso strings for JSON stringify
                w.date = w.date.toISOString()
                exercise_ids.splice(exercise_ids.length,0,...w.exercise_ids)
            }

            // get all workout exercises of based on workout exercise IDs collected
            let exercises = []
            console.log(exercise_ids)
            if (exercise_ids.length > 0) {
                const exercisesSql = `select * from exercises where id in (${exercise_ids.map(() => "?").join()})`
                exercises = (await con.execute(exercisesSql, exercise_ids))[0]
            }

            // collect all set IDs
            const setIds = []
            for (let e of exercises) setIds.splice(setIds.length,0,...e.set_ids)
            let sets = []
            if (setIds.length > 0) {
                const setsSql = `select * from sets where id in(${setIds.map(() => "?").join()})`
                sets = (await con.execute(setsSql, setIds))[0]
            }

            await con.end()
            response.writeHead(200, {'Content-Type': 'application/json'})
            response.write(JSON.stringify({"workouts":workouts, "exercises":exercises, "sets":sets}))
            response.end()
        } else {
            response.writeHead(404, {'Content-Type': 'text/html'})
            response.end("<html><body><h1 style='text-align: center;'>404 - Not Found</h1></body></html>")
        }
    } else if (request.method == 'POST') {
        let body = ''
        request.on('data', function(data) {body += data})
        request.on('end', async function() {

            if (request.url == "/login") {
                await sessionsProcess.loginProcess(body, response)
                return                

            } else if (["/new","/delete","/update"].includes(request.url)) {
                const payload = JSON.parse(body)
                const dbFuncs = {
                    "/new": dbService.newEntry,
                    "/delete": dbService.deleteEntry,
                    "/update": dbService.updateEntry
                }
                let result = await dbFuncs[request.url](payload)
                if (result.result) {
                    response.writeHead(200, {"Content-Type":"application/json"})
                    response.write(JSON.stringify(result))
                } else {
                    console.log(result)
                    response.writeHead(500, {"Content-Type":"application/json"})
                    response.write(JSON.stringify({result: false, error: result.error}))
                }
            } else {
                response.writeHead(404, {"Content-Type":"text/plain"})
                response.write("404 - Not Found")
            }
            response.end()
        })
    }
}).listen(process.env.PORT)
console.log(`Listening on port ${process.env.PORT}`)