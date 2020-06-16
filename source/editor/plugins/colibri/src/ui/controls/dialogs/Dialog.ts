namespace colibri.ui.controls.dialogs {

    export class Dialog extends Control {

        public eventDialogClose = new ListenerList();

        private _containerElement: HTMLElement;
        private _buttonPaneElement: HTMLElement;
        private _titlePaneElement: HTMLElement;
        private _width: number;
        private _height: number;
        private static _dialogs: Dialog[] = [];
        private static _firstTime = true;
        private _parentDialog: Dialog;
        private _closeWithEscapeKey: boolean;

        constructor(...classList: string[]) {
            super("div", "Dialog", ...classList);

            this._closeWithEscapeKey = true;

            this.setSize(400 * controls.DEVICE_PIXEL_RATIO, 300 * controls.DEVICE_PIXEL_RATIO);

            this._parentDialog = Dialog._dialogs.length === 0 ?
                null : Dialog._dialogs[Dialog._dialogs.length - 1];

            if (Dialog._firstTime) {

                Dialog._firstTime = false;

                window.addEventListener("keydown", e => {

                    if (e.code === "Escape") {

                        if (Dialog._dialogs.length > 0) {

                            const dlg = Dialog._dialogs[Dialog._dialogs.length - 1];

                            if (dlg.isCloseWithEscapeKey()) {
                                dlg.close();
                            }
                        }
                    }
                });

                colibri.Platform.getWorkbench().eventThemeChanged.addListener(() => {

                    for (const dlg of Dialog._dialogs) {

                        dlg.layout();
                    }
                });

                window.addEventListener("resize", e => {

                    for (const dlg of Dialog._dialogs) {
                        dlg.layout();
                    }
                });
            }

            Dialog._dialogs.push(this);
        }

        static closeAllDialogs() {

            for (const dlg of this._dialogs) {
                dlg.close();
            }
        }

        static getActiveDialog() {
            return Dialog._dialogs[Dialog._dialogs.length - 1];
        }

        getDialogBackgroundElement() {
            return this._containerElement;
        }

        setCloseWithEscapeKey(closeWithEscapeKey: boolean) {
            this._closeWithEscapeKey = closeWithEscapeKey;
        }

        isCloseWithEscapeKey() {
            return this._closeWithEscapeKey;
        }

        getParentDialog() {
            return this._parentDialog;
        }

        create() {

            this._containerElement = document.createElement("div");
            this._containerElement.classList.add("DialogContainer");

            document.body.appendChild(this._containerElement);
            document.body.appendChild(this.getElement());

            window.addEventListener("resize", () => this.resize());

            this._titlePaneElement = document.createElement("div");
            this._titlePaneElement.classList.add("DialogTitlePane");
            this.getElement().appendChild(this._titlePaneElement);

            this.createDialogArea();

            this._buttonPaneElement = document.createElement("div");
            this._buttonPaneElement.classList.add("DialogButtonPane");

            this.getElement().appendChild(this._buttonPaneElement);

            this.resize();

            if (this._parentDialog) {
                this._parentDialog._containerElement.style.display = "none";
                this._parentDialog.style.display = "none";
            }
        }

        setTitle(title: string) {
            this._titlePaneElement.innerText = title;
        }

        addCancelButton() {
            this.addButton("Cancel", () => this.close());
        }

        addButton(text: string, callback: () => void) {

            const btn = document.createElement("button");

            btn.innerText = text;

            btn.addEventListener("click", e => callback());

            this._buttonPaneElement.appendChild(btn);

            return btn;
        }

        addElementToButtonPanel(element: HTMLElement) {

            this._buttonPaneElement.appendChild(element);
        }

        connectInputWithButton(inputElement: HTMLInputElement, btnElement: HTMLButtonElement) {

            inputElement.addEventListener("keyup", e => {

                if (e.keyCode === 13) {

                    e.preventDefault();

                    btnElement.click();
                }
            });
        }

        protected createDialogArea() {
            // nothing
        }

        protected resize() {

            this.setBounds({
                x: window.innerWidth / 2 - this._width / 2,
                y: window.innerHeight * 0.2,
                width: this._width,
                height: this._height
            });
        }

        setSize(width: number, height: number, adjustToDPR = false) {

            this._width = Math.floor(width * (adjustToDPR ? controls.DEVICE_PIXEL_RATIO : 1));
            this._height = Math.floor(height * (adjustToDPR ? controls.DEVICE_PIXEL_RATIO : 1));

            const margin = window.innerHeight * 0.2;

            if (this._width > window.innerWidth) {

                this._width = window.innerWidth - 10;
            }

            if (this._height > window.innerHeight - margin) {

                this._height = window.innerHeight - margin - 10;
            }
        }

        getSize() {

            return { width: this._width, height: this._height };
        }

        close() {

            Dialog._dialogs = Dialog._dialogs.filter(d => d !== this);

            this._containerElement.remove();
            this.getElement().remove();

            this.eventDialogClose.fire();

            if (this._parentDialog) {
                this._parentDialog._containerElement.style.display = "block";
                this._parentDialog.style.display = "grid";
                this._parentDialog.goFront();
            }
        }

        protected goFront() {
            // nothing
        }

        closeAll() {

            this.close();

            if (this._parentDialog) {
                this._parentDialog.closeAll();
            }
        }

    }

}