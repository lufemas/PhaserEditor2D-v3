namespace phasereditor2d.scene.ui.sceneobjects {

    import read = colibri.core.json.read;
    import write = colibri.core.json.write;
    import controls = colibri.ui.controls;
    import json = core.json;

    export enum ObjectScope {

        METHOD = "METHOD",
        CLASS = "CLASS",
        PUBLIC = "PUBLIC"
    }

    export abstract class EditorSupport<T extends ISceneObject> {

        private _extension: SceneObjectExtension;
        private _object: T;
        private _prefabId: string;
        private _label: string;
        private _scope: ObjectScope;
        private _scene: Scene;
        private _serializables: json.ISerializable[];
        // tslint:disable-next-line:ban-types
        private _componentMap: Map<Function, Component<any>>;
        private _unlockedProperties: Set<string>;

        constructor(extension: SceneObjectExtension, obj: T) {

            this._extension = extension;
            this._object = obj;
            this._serializables = [];
            this._componentMap = new Map();
            this._object.setDataEnabled();
            this.setId(Phaser.Utils.String.UUID());
            this._scope = ObjectScope.METHOD;
            this._unlockedProperties = new Set();

            this.addComponent(new VariableComponent(this._object));
        }

        destroy() {

            const obj = this.getObject();

            obj.disableInteractive();
            obj.destroy();
        }

        hasProperty(property: IProperty<any>) {

            for (const comp of this._componentMap.values()) {

                if (comp.getProperties().has(property)) {

                    return true;
                }
            }

            return false;
        }

        isUnlockedProperty(property: IProperty<any>) {

            if (property === TransformComponent.x || property === TransformComponent.y) {
                return true;
            }

            if (this.isPrefabInstance()) {

                return this._unlockedProperties.has(property.name);
            }

            return true;
        }

        setUnlockedProperty(property: IProperty<any>, unlock: boolean) {

            if (unlock) {

                this._unlockedProperties.add(property.name);

            } else {

                this._unlockedProperties.delete(property.name);
            }
        }

        private static async buildPrefabDependencyHash(builder: ide.core.MultiHashBuilder, prefabId: string) {

            if (!prefabId) {
                return;
            }

            const finder = ScenePlugin.getInstance().getSceneFinder();

            const file = finder.getPrefabFile(prefabId);

            if (!file) {
                return;
            }

            const token = "prefab(" + prefabId + "," + file.getModTime() + ")";

            builder.addPartialToken(token);

            const sceneData = finder.getSceneData(file);

            if (!sceneData) {
                return;
            }

            for (const objData of sceneData.displayList) {

                this.buildPrefabDependencyHash(builder, objData.prefabId);
            }
        }

        async buildDependencyHash(args: IBuildDependencyHashArgs) {

            EditorSupport.buildPrefabDependencyHash(args.builder, this._prefabId);

            for (const comp of this.getComponents()) {

                comp.buildDependenciesHash(args);
            }
        }

        abstract getScreenBounds(camera: Phaser.Cameras.Scene2D.Camera): Phaser.Math.Vector2[];

        abstract getCellRenderer(): controls.viewers.ICellRenderer;

        abstract setInteractive(): void;

        // tslint:disable-next-line:ban-types
        getComponent(ctr: Function): Component<any> {
            return this._componentMap.get(ctr);
        }

        // tslint:disable-next-line:ban-types
        hasComponent(ctr: Function) {
            return this._componentMap.has(ctr);
        }

        getComponents() {
            return this._componentMap.values();
        }

        adjustAfterTypeChange(originalObject: ISceneObject) {

            for (const comp of this.getComponents()) {

                comp.adjustAfterTypeChange(originalObject);
            }
        }

        // tslint:disable-next-line:ban-types
        static getObjectComponent(obj: any, ctr: Function) {

            if (obj && typeof obj["getEditorSupport"] === "function") {

                const support = obj["getEditorSupport"]() as EditorSupport<any>;

                return support.getComponent(ctr) ?? null;
            }

            return null;
        }

        // tslint:disable-next-line:ban-types
        static hasObjectComponent(obj: any, ctr: Function) {

            return this.getObjectComponent(obj, ctr) !== null;
        }

        protected addComponent(...components: Array<Component<any>>) {

            for (const c of components) {

                this._componentMap.set(c.constructor, c);
            }

            this._serializables.push(...components);
        }

        protected setNewId(sprite: sceneobjects.ISceneObject) {
            this.setId(Phaser.Utils.String.UUID());
        }

        getExtension() {
            return this._extension;
        }

        getObject() {
            return this._object;
        }

        getId() {
            return this._object.name;
        }

        setId(id: string) {
            this._object.name = id;
        }

        getLabel() {
            return this._label;
        }

        setLabel(label: string) {
            this._label = label;
        }

        getScope() {
            return this._scope;
        }

        setScope(scope: ObjectScope) {
            this._scope = scope;
        }

        getScene() {
            return this._scene;
        }

        setScene(scene: Scene) {
            this._scene = scene;
        }

        isPrefabInstance() {
            return typeof this._prefabId === "string";
        }

        getOwnerPrefabInstance(): ISceneObject {

            if (this._object.parentContainer) {

                const parent = this._object.parentContainer as unknown as ISceneObject;

                return parent.getEditorSupport().getOwnerPrefabInstance();
            }

            if (this._object.getEditorSupport().isPrefabInstance()) {

                return this._object;
            }

            return null;
        }

        getPrefabId() {
            return this._prefabId;
        }

        getPrefabName() {

            const file = this.getPrefabFile();

            if (file) {

                return file.getNameWithoutExtension();

            }

            return null;
        }

        getPrefabFile() {

            if (this._prefabId) {

                const finder = ScenePlugin.getInstance().getSceneFinder();

                const file = finder.getPrefabFile(this._prefabId);

                return file;
            }

            return null;
        }

        getPrefabData() {

            if (this._prefabId) {

                const finder = ScenePlugin.getInstance().getSceneFinder();

                const data = finder.getPrefabData(this._prefabId);

                return data;
            }

            return null;
        }

        getPrefabSerializer() {

            const data = this.getPrefabData();

            if (data) {

                return this._scene.getMaker().getSerializer(data);
            }

            return null;
        }

        getObjectType() {

            const ser = this._scene.getMaker().getSerializer({
                id: this.getId(),
                type: this._extension.getTypeName(),
                prefabId: this._prefabId,
                label: "temporal"
            });

            return ser.getType();
        }

        getPhaserType() {

            const ser = this._scene.getMaker().getSerializer({
                id: this.getId(),
                type: this._extension.getTypeName(),
                prefabId: this._prefabId,
                label: "temporal",
            });

            return ser.getPhaserType();
        }

        getSerializer(data: json.IObjectData) {

            return this._scene.getMaker().getSerializer(data);
        }

        writeJSON(data: json.IObjectData) {

            if (this.isPrefabInstance()) {

                data.prefabId = this._prefabId;

            } else {

                data.type = this._extension.getTypeName();
            }

            data.id = this.getId();

            if (this._prefabId && this._unlockedProperties.size > 0) {

                data["unlock"] = [...this._unlockedProperties];
            }

            const ser = this.getSerializer(data);

            for (const s of this._serializables) {

                s.writeJSON(ser);
            }
        }

        readJSON(data: json.IObjectData) {

            const ser = this.getSerializer(data);

            this.setId(data.id);

            this._prefabId = data.prefabId;
            this._unlockedProperties = new Set(data["unlock"] ?? []);

            for (const s of this._serializables) {

                s.readJSON(ser);
            }
        }
    }
}