import * as electron from 'electron';

const { app, BrowserWindow } = electron;

if(process.env.NODE_ENV === 'development') {
    
    const createWindow = (url: string) => {
        const win = new BrowserWindow({
            width: 1024 + 576,
            height: 768,
        })
        win.loadURL(url);
        console.log("electron win load url:", url);
        win.webContents.openDevTools();
        return win;
    }
    app.on("ready", () => {
        const win = createWindow(process.env.ELECTRON_URL as string);
        win.on("ready-to-show", () => {
            console.log("electron win ready-to-show");
        });
        win.on("show", () => {
            console.log("electron win show");
        });
        win.on("minimize", () => {
            console.log("electron win minimize");
        });
        win.on("maximize", () => {
            console.log("electron win minimize");
        });
        win.on("unmaximize", () => {
            console.log("electron win unmaximize");
        });
        win.on("close", () => {
            console.log("electron win close");
        })
        win.on("closed", () => {
            console.log("electron win closed");
        })
    });

    
}
