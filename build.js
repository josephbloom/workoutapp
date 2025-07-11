#!/usr/bin/env node

const readline = require("readline")
const fs = require("fs")
const mysql = require("mysql2/promise")
const argon2 = require("argon2")

let mysqlHost
let mysqlUser
let mysqlPassword

let loginPassword
let exercisePassword

let username
let password

const exerciseUser = "exercise_user2"
const loginUser = "login_user2"
const db = "workouts2"

process.stdout.write("Starting...\n")

async function getMySQLCreds() {
    console.log("First, enter MySQL credentials so users and databases may be added.\n")
    mysqlHost = await askQuestion(false, 'What is the MySQL host? ')
    mysqlUser = await askQuestion(false, 'What is the MySQL account username? ')
    mysqlPassword = await askQuestion(true, "What is the MySQL password? [passwords are hidden] ")
    console.log()
}

async function getMySQLUserCreds() {
    console.log("\nNext, passwords for the two MySQL application users must be set. One user is for logging in, the other is for accessing the exercise data.")
    loginPassword = await askQuestion(true, 'What is the password for the MySQL login account? ')
    console.log()
    exercisePassword = await askQuestion(true, "What is the password for the MySQL exercise account? ")
}

async function getUserCreds() {
    console.log("\nFinally, make credentials for the account that will log into the application.")
    username = await askQuestion(false, 'What is the username for the application user? ')
    password = await askQuestion(true, 'What is the password for the application user? ')
}

async function askQuestion (hidden, message) {
    rl.stdoutMuted = hidden
    rl.query = message
    return await ask(message)
}

const makeExerciseUser = () => {
    return `
        CREATE USER '${exerciseUser}'@'${mysqlHost}' IDENTIFIED BY '${exercisePassword}';
        GRANT USAGE ON *.* TO '${exerciseUser}'@'${mysqlHost}';
        GRANT SELECT, INSERT, UPDATE, DELETE ON ${db}.exercises TO '${exerciseUser}'@'${mysqlHost}';
        GRANT SELECT, INSERT, UPDATE, DELETE ON ${db}.movements TO '${exerciseUser}'@'${mysqlHost}';
        GRANT SELECT, INSERT, UPDATE, DELETE ON ${db}.sets TO '${exerciseUser}'@'${mysqlHost}';
        GRANT SELECT, INSERT, UPDATE, DELETE ON ${db}.workouts TO '${exerciseUser}'@'${mysqlHost}';
    `
}

const makeLoginUser = () => {
    return `
        CREATE USER '${loginUser}'@'${mysqlHost}' IDENTIFIED BY '${loginPassword}';
        GRANT USAGE ON *.* TO '${loginUser}'@'${mysqlHost}';
        GRANT SELECT, INSERT, UPDATE, DELETE ON ${db}.sessions TO '${loginUser}'@'${mysqlHost}';
        GRANT SELECT, INSERT, UPDATE, DELETE ON ${db}.users TO '${loginUser}'@'${mysqlHost}';
    `
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function ask(question) {
  return new Promise(resolve => {
    rl.question(question, resolve);
  });
}

rl.stdoutMuted = false
rl.startMute = false

rl._writeToOutput = function _writeToOutput(stringToWrite) {
    if (rl.stdoutMuted) {
        // let anim
        // switch (rl.line.length%4) {
        //     case 0: anim = "|"; break;
        //     case 1: anim = "/"; break;
        //     case 2: anim = "—"; break;
        //     case 3: anim = "\\"; break;
        // }
        // rl.output.write("\x1B[2K\x1B[200D"+rl.query+"["+anim+"]")
        rl.output.write("\x1B[2K\x1B[200D"+rl.query)
    } else {
        rl.output.write(stringToWrite)
    }
};

async function main() {

    await getMySQLCreds()

    // console.log(mysqlHost)
    // console.log(mysqlUser)
    // console.log(mysqlPassword)
    // console.log("Finish early!")
    // process.exit(0)

    const sqlCreds = {
        host: mysqlHost,
        user: mysqlUser,
        password: mysqlPassword,
        multipleStatements: true
    }

    console.log("\nChecking connection to MySQL...")
    try {
        const con = await mysql.createConnection(sqlCreds)
        await con.end()
        console.log("MySQL credential test successful.")
    } catch (err) {
        console.log(err)
        console.log("MySQL CREDENTIALS INCORRECT.\n")
        process.exit(1)
    }

    const workoutsSchema = fs.readFileSync("workouts_db_schema.sql", "utf8")
    const movementsInserts = fs.readFileSync("movements_inserts.sql", "utf8")

    console.log("Setting up workouts database and starter movement data...")
    const mysqlCon = await mysql.createConnection(sqlCreds)
    await mysqlCon.query(workoutsSchema)
    await mysqlCon.query(movementsInserts)

    // ASK USER FOR MYSQL USER PASSWORDS
    await getMySQLUserCreds()

    console.log("\nCreating login and exercise users in MySQL...")
    await mysqlCon.query(makeExerciseUser())
    await mysqlCon.query(makeLoginUser())

    console.log("Generating .env file...")
    let envText = fs.readFileSync(".env.template", "utf8")
    envText = envText.replace(/(?<=MYSQL_USER_EXERCISE=)[^\n]*(?=(?:\n|$))/,`"${exerciseUser}"`)
    envText = envText.replace(/(?<=MYSQL_PASSWORD_EXERCISE=)[^\n]*(?=(?:\n|$))/,`"${exercisePassword}"`)
    envText = envText.replace(/(?<=MYSQL_DATABASE_EXERCISE=)[^\n]*(?=(?:\n|$))/,`"${db}"`)

    envText = envText.replace(/(?<=MYSQL_USER_LOGIN=)[^\n]*(?=(?:\n|$))/,`"${loginUser}"`)
    envText = envText.replace(/(?<=MYSQL_PASSWORD_LOGIN=)[^\n]*(?=(?:\n|$))/,`"${loginPassword}"`)
    envText = envText.replace(/(?<=MYSQL_DATABASE_LOGIN=)[^\n]*(?=(?:\n|$))/,`"${db}"`)

    envText = envText.replace(/(?<=MYSQL_HOST=)[^\n]*(?=(?:\n|$))/,`"${mysqlHost}"`)

    fs.writeFileSync(".env", envText, "utf8")

    await getUserCreds()
    rl.close()

    console.log("\n\nAdding application user account...")
    const appUserResults = await mysqlCon.execute(`insert into ${db}.users (username, hash) values (?,?)`,[username, await argon2.hash(password)])
    // console.log(appUserResults)
    await mysqlCon.end()

    if (appUserResults[0].affectedRows === 1) console.log("Successfully added application user.")
    else console.error("Error while adding appliation user!")

    console.log("Finished!\n")
}
main()