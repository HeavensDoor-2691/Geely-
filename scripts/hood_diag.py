import bpy, mathutils, sys

GLB = r'C:\Users\Joey\Desktop\01app\src\model\Geely-original.glb'

bpy.ops.import_scene.gltf(filepath=GLB)
print('=== IMPORT DONE ===')

def bbox(obj):
    bb = [obj.matrix_world @ mathutils.Vector(v) for v in obj.bound_box]
    xs=[v.x for v in bb]; ys=[v.y for v in bb]; zs=[v.z for v in bb]
    return (min(xs),max(xs),min(ys),max(ys),min(zs),max(zs))

# 1) 全貌：打印所有 mesh 包围盒
print('=== ALL MESHES ===')
for obj in bpy.data.objects:
    if obj.type=='MESH':
        x0,x1,y0,y1,z0,z1 = bbox(obj)
        print(f'{obj.name}  verts={len(obj.data.vertices)} polys={len(obj.data.polygons)}  bbX=({x0:.2f},{x1:.2f}) bbY=({y0:.2f},{y1:.2f}) bbZ=({z0:.2f},{z1:.2f})')

# 2) 定位引擎盖区域 mesh（车头顶部：y 上、z 车头端、x 中部）
print('=== HOOD REGION MESHES ===')
def covers_hood(x0,x1,y0,y1,z0,z1):
    return y1>1.3 and z1>1.2 and x0<-0.3 and x1>0.3
for obj in bpy.data.objects:
    if obj.type!='MESH': continue
    x0,x1,y0,y1,z0,z1 = bbox(obj)
    if covers_hood(x0,x1,y0,y1,z0,z1):
        # 分析该 mesh 法线/拓扑
        mesh=obj.data
        nface=sum(1 for p in mesh.polygons if len(p.vertices)!=4)
        # 面法线与视线/平均朝向
        norms=[p.normal for p in mesh.polygons]
        import statistics
        # 打印法线统计（方向分布）
        print(f'[HOOD-MESH] {obj.name} verts={len(mesh.vertices)} polys={len(mesh.polygons)} nonquad={nface}  bbY=({y0:.2f},{y1:.2f}) bbZ=({z0:.2f},{z1:.2f})')
        # 检查是否有翻转/背面
        zpos=0; zneg=0; up=0; down=0
        for p in mesh.polygons:
            n=p.normal
            if n.z>0.5: up+=1
            elif n.z<-0.5: down+=1
            elif n.z>0.1: zpos+=1
            elif n.z<-0.1: zneg+=1
        print(f'   normal: up={up} down={down} slight+z={zpos} slight-z={zneg}  (朝向统计)')

print('=== DONE ===')
