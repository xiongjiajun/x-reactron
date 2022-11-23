const detectPort = require('detect-port');
const proc = require('child_process');
const { join } = require('path');
const chalk = require('chalk');
const dayjs = require('dayjs');
const kill = require('tree-kill');

const cwd = process.cwd();

const YYYY_MM_DD_HH_mm_ss = "YYYY-MM-DD HH:mm:ss.SSS";
const time = () => {
    return chalk.gray(`[${dayjs().format(YYYY_MM_DD_HH_mm_ss)}]`);
}

const npx = process.platform === 'win32' ? 'npx.cmd': 'npx';

const TSC = chalk.bgBlue("TSC");
const REACT = chalk.bgCyan("REACT");
const ELECTRON = chalk.bgGreen("ELECTRON");


class Dev {

    port = 3000;
    electronHandler;

    async tscElectronMain() {
        await new Promise((resolve) => {
            const tsc = proc.spawn(npx, ['tsc', join(cwd, 'electron/main.ts'), '--outDir', join(cwd, '.electron'), '--module', 'commonjs', '--watch']);
            let resolved = false;
            let hasChanged = false;
            tsc.stdout.on('data', data => {
                const message = data.toString();
                if(message.includes("Starting compilation in watch mode...")) {
                    console.log(time(), TSC, "Starting compilation in watch mode...\n");
                }else if(message.includes("File change detected. Starting incremental compilation...")) {
                    console.log(time(), TSC, "File change detected. Starting incremental compilation...\n");
                    hasChanged = true;
                }else if(/Found \d+ errors. Watching for file changes./g.test(message)) {
                    const errors = message.match(/ \d+ /g);     // [ '0' ] == 0 is true
                    console.log(time(), TSC, "Found" + (errors == 0 ? chalk.green(errors) : chalk.red(errors)) + "errors\n");
                    if(errors == 0) {
                        if(!resolved && !hasChanged) {
                            resolved = true;
                            resolve();
                        }
                        if(hasChanged) {
                            hasChanged = false;
                            if(this.electronHandler) {
                                if(this.electronHandler.pid) {
                                    kill(this.electronHandler.pid, (err) => {
                                        if(err) {
                                            console.log(time(), ELECTRON, chalk.redBright("kill failed\n"));
                                        }else {
                                            console.log(time(), ELECTRON, chalk.rgb(255, 0, 255)("electron killed\n"));
                                            this.launchElectron();
                                        }
                                    });
                                }
                            }
                        }
                    }
                }else if(message.includes('error')) {
                    console.log(time(), TSC, chalk.redBright(message) + "\n");
                }
            });
            tsc.stderr.on('data', data => {
                const message = data.toString();
                console.error(time(), TSC, chalk.yellowBright(message) + "\n");
            });
        });
    }

    async startReactDevServer() {
        this.port = await detectPort(this.port);
        await new Promise(async (resolve) => {
            let resolved = false;
            process.env.PORT = this.port;
            process.env.BROWSER = 'none';
            const cra = proc.spawn(npx, ["craco", "start"]);
            cra.stdout.on('data', (data) => {
                const message = data.toString();
                if(!message) {
                    return ;
                }
                if(message.includes("You can now view ")) {
                    //过滤以下输出
                    //You can now view x-reactron in the browser.
                    //Local:            http://localhost:3000
                    //On Your Network:  http://192.168.50.193:3000
                    //Note that the development build is not optimized.
                    //To create a production build, use yarn build.
                    return; 
                }
                console.log(time(), REACT, message);
                if(message.includes("No issues found.")) {
                    if(!resolved) {
                        resolve();
                    }
                }
            });
            cra.stderr.on('data', (data) => {
                const message = data.toString();
                if(message.includes("DeprecationWarning")) {
                    //忽略DeprecationWarning
                    return ;
                }
                console.error(time(), REACT, chalk.yellowBright(message));
            });
        });
    }

    launchElectron() {
        process.env.ELECTRON_URL = `http://localhost:${this.port}`;
        const electron = proc.spawn(npx, ['electron', './.electron/main']);
        electron.stdout.on('data', (data) => {
            const message = data.toString();
            if(!message) {
                return ;
            }
            if(message.includes("electron")) {            
                console.log(time(), ELECTRON, chalk.rgb(255, 0, 255)(message));
                if(message.includes("electron win closed")) {
                    process.exit();
                }
            }else {
                console.log(time(), ELECTRON, message);
            }
        });
        electron.stderr.on('data', (data) => {
            const message = data.toString();
            console.error(time(), ELECTRON, chalk.yellowBright(message));
        });
        this.electronHandler = electron;
    }

    async run() {
        await this.tscElectronMain();
        await this.startReactDevServer();
        this.launchElectron();
    }

}

new Dev().run();