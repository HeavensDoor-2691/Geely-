import bpy, mathutils, sys

GLB = r'C:\Users\Joey\Desktop\01app\src\model\Geely-hoodfix2-uncomp.glb'

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=GLB)
bpy.context.view_layer.update()

def mesh_bbox(obj):
    mw = obj.matrix_world
    xs=[]; ys=[]; zs=[]
    for v in obj.data.vertices:
        w = mw @ v.co
        xs.append(w.x); ys.append(w.y); zs.append(w.z)
    return (min(xs), max(xs), min(ys), max(ys), min(zs), max(zs))

def f(b):
    x0,x1,y0,y1,z0,z1 = b
    cx=(x0+x1)/2; cy=(y0+y1)/2; cz=(z0+z1)/2
    return f'Blender x[{x0:.4f},{x1:.4f}] y[{y0:.4f},{y1:.4f}] z[{z0:.4f},{z1:.4f}] center=({cx:.4f},{cy:.4f},{cz:.4f})'

def to_gltf(b):
    # glTF(Y-up) <- Blender(Z-up): gX=BX, gY=-BZ, gZ=BY
    x0,x1,y0,y1,z0,z1 = b
    def g(p): return (p[0], -p[2], p[1])
    c = ((x0+x1)/2, (y0+y1)/2, (z0+z1)/2)
    gc = g(c)
    return f'glTF   center=({gc[0]:.4f},{gc[1]:.4f},{gc[2]:.4f})'

meshes = [o for o in bpy.data.objects if o.type=='MESH']
ax=[]; ay=[]; az=[]
for o in meshes:
    x0,x1,y0,y1,z0,z1 = mesh_bbox(o)
    ax += [x0,x1]; ay += [y0,y1]; az += [z0,z1]
print('MODEL_BBOX', f((min(ax),max(ax),min(ay),max(ay),min(az),max(az))))
print('MODEL_BBOX glTF center=', to_gltf((min(ax),max(ax),min(ay),max(ay),min(az),max(az))))

keys = ['front seat', 'rear seat', 'ip', 'screen', 'inner top', 'windshield', 'headlamp', 'qianlian', 'houweiqi', 'rear tail', 'steer', 'roof', 'seatbelt']
print('=== KEY PARTS (Blender + glTF) ===')
for o in meshes:
    nm = o.name.lower()
    for k in keys:
        if k in nm:
            b = mesh_bbox(o)
            print(f'[{o.name}]')
            print('   ', f(b))
            print('   ', to_gltf(b))
            break
