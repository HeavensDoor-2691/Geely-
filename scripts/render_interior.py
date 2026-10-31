import bpy, mathutils, sys, os

GLB = r'C:\Users\Joey\Desktop\01app\src\model\Geely-hoodfix2-uncomp.glb'
OUT = r'C:\Users\Joey\Desktop\01app\scripts\_verify_interior.png'

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
bpy.context.view_layer.update()

# 灯光
bpy.ops.object.light_add(type='SUN', location=(0, 2.0, 3.0))
bpy.context.active_object.data.energy = 3.0
bpy.ops.object.light_add(type='SUN', location=(-2, 0, 2.0))
bpy.context.active_object.data.energy = 1.5
bpy.ops.object.light_add(type='AREA', location=(0, 1.2, 0.5))
bpy.context.active_object.data.energy = 300
bpy.context.active_object.data.size = 1.0

# 相机：第一排座椅眼高，看向中控（glTF -> Blender: (x, -z, y)）
cam = bpy.data.cameras.new('Cam')
cam.lens = 30
cam_obj = bpy.data.objects.new('Cam', cam)
bpy.context.scene.collection.objects.link(cam_obj)
cam_obj.location = mathutils.Vector((0, -0.085, 1.15))
target = mathutils.Vector((0, -0.747, 1.055))
dirv = target - cam_obj.location
cam_obj.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()

scene = bpy.context.scene
scene.camera = cam_obj
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1280
scene.render.resolution_y = 800
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = os.path.abspath(OUT)
bpy.ops.render.render(write_still=True)
print('=== RENDERED', os.path.abspath(OUT), 'exists=', os.path.exists(os.path.abspath(OUT)))
