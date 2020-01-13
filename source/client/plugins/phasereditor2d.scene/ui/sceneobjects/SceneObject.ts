namespace phasereditor2d.scene.ui.sceneobjects {

    export interface SceneObject extends

        ISceneObjectLike,

        Phaser.GameObjects.GameObject {

        getEditorSupport(): EditorSupport<SceneObject>;
    }
}