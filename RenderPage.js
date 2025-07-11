const fs = require('fs')

exports.readIndex = (page, response) => {
    let rootPath = ""
    const slashIndex = page.lastIndexOf("/")
    if (slashIndex != -1) {
        rootPath = page.slice(0,(slashIndex+1))
        // page = page.slice(slashIndex+1)
    }

    let template = fs.readFileSync(page, "utf8")
    reg = RegExp(/<%([^%]+)%>/gm)
    let f
    console.log("RenderPage received "+page)
    while ((f = reg.exec(template)) != null) {
        let line = f[1].trim().split(" ")
        // console.log(line)
        if (line[0] == "include") {
            const pathToFile = rootPath+line[1]
            console.log(line, ": retrieve "+pathToFile)
            let newPage = fs.readFileSync(pathToFile, "utf8")
            template = template.replaceAll(f[0], newPage)
        }
    }
    // return template
    response.writeHead(200, {'Content-Type': 'text/html'})
    response.write(template)
    response.end()
    console.log("\n")
}
