import bpy, mathutils, sys, os

# 用法: blender -b -P render_hood.py -- <glb> <out.png> <mode>
args = sys.argv[sys.argv.index('--') + 1:]
GLB = args[0]
OUT = args[1]
MODE = args[2] if len(args) > 2 else 'hood'   # hood=引擎盖特写, front=车头正面

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)

# 打印模型在 Blender 坐标下的包围盒
bpy.context.view_layer.update()
mins = [1e9]*3; maxs = [-1e9]*3
for o in bpy.data.objects:
    if o.type == 'MESH':
        mw = o.matrix_world
        for v in o.data.vertices:
            wv = mw @ v.co
            for i in range(3):
                mins[i] = min(mins[i], wv[i]); maxs[i] = max(maxs[i], wv[i])
print('MODEL_BBOX x[%.3f,%.3f] y[%.3f,%.3f] z[%.3f,%.3f]' % (mins[0],maxs[0],mins[1],maxs[1],mins[2],maxs[2]))


# 把模型摆到原点（可能 glb 带偏移）
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.select_set(True)
bpy.context.view_layer.objects.active = [o for o in bpy.data.objects if o.type=='MESH'][0]
bpy.ops.object.origin_set(type='ORIGIN_GEOMETRY', center='BOUNDS')

# 灯光
bpy.ops.object.light_add(type='SUN', location=(2.5, 3.0, 2.5))
sun = bpy.context.active_object
sun.data.energy = 3.0
sun.rotation_euler = (0.9, -0.4, 0.6)
# 侧光（强化曲面折痕）
bpy.ops.object.light_add(type='SUN', location=(3.0, -2.0, 1.5))
sun2 = bpy.context.active_object
sun2.data.energy = 2.2
sun2.rotation_euler = (1.1, 0.2, 0.35)
# 环境光（世界）
if 'World' not in bpy.data.worlds:
    bpy.data.worlds.new('World')
world = bpy.data.worlds['World']
bpy.context.scene.world = world
world.use_nodes = True
bg = world.node_tree.nodes['Background']
bg.inputs[0].default_value = (0.9, 0.9, 0.92, 1)
bg.inputs[1].default_value = 1.0

# 相机
if 'Camera' not in bpy.data.objects:
    bpy.ops.object.camera_add(location=(0, 0, 0))
cam = bpy.data.objects['Camera']
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 900
scene.render.resolution_y = 720
scene.render.film_transparent = False
if MODE == 'hood':
    cam.location = mathutils.Vector((0, -3.8, 1.4))
    target = mathutils.Vector((0, -1.9, 1.15))
    scene.camera = cam
elif MODE == 'top':
    cam.location = mathutils.Vector((0, 5.4, 0.4))
    target = mathutils.Vector((0, 1.6, 0.8))
    cam.data.lens = 30
    scene.camera = cam
else:
    cam.location = mathutils.Vector((0, 1.2, 3.6))
    target = mathutils.Vector((0, 1.2, 1.0))
    scene.camera = cam

# 统一设置镜头与朝向
cam.data.lens = 30
dirv = target - cam.location
cam.rotation_euler = dirv.to_track_quat('-Z', 'Y').to_euler()

# 隐藏热点标记等无关对象（若有）
for o in bpy.data.objects:
    if o.type == 'EMPTY':
        o.hide_render = True

scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = os.path.abspath(OUT)
bpy.ops.render.render(write_still=True)
print('=== RENDERED', os.path.abspath(OUT), 'exists=', os.path.exists(os.path.abspath(OUT)))
