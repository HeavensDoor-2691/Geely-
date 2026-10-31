import bpy, mathutils, sys

SRC = r'C:\Users\Joey\Desktop\01app\src\model\Geely-original.glb'
DST = r'C:\Users\Joey\Desktop\01app\src\model\Geely-hoodfix.glb'

bpy.ops.import_scene.gltf(filepath=SRC)
print('=== IMPORTED, meshes=', sum(1 for o in bpy.data.objects if o.type=='MESH'))

# 对整个模型应用按角度平滑法线（30°），消除三角形折面、保留硬边
for obj in bpy.data.objects:
    if obj.type != 'MESH':
        continue
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.shade_smooth_by_angle(angle=30.0 * 3.14159265358979 / 180.0)
    obj.select_set(False)

# 导出 GLB
bpy.ops.object.select_all(action='SELECT')
bpy.ops.export_scene.gltf(
    filepath=DST,
    export_format='GLB',
    use_selection=False,
)
print('=== EXPORTED', DST)
