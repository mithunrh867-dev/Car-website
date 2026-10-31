import os
import sys
import re
import time
from concurrent.futures import ProcessPoolExecutor
from PIL import Image, ImageChops, ImageStat

def natural_sort_key(s):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', s)]

def is_nearly_identical(p1, p2, threshold=3.0):
    im1 = Image.open(p1).convert('RGB')
    im2 = Image.open(p2).convert('RGB')
    diff_mean = sum(ImageStat.Stat(ImageChops.difference(im1, im2)).mean) / 3.0
    return diff_mean < threshold

def get_folder_files(folder_path):
    if not os.path.exists(folder_path):
        return []
    valid_exts = {'.jpg', '.jpeg', '.png', '.webp'}
    files = [os.path.join(folder_path, f) for f in os.listdir(folder_path) if os.path.splitext(f)[1].lower() in valid_exts]
    return sorted(files, key=lambda f: natural_sort_key(os.path.basename(f)))

def process_one_frame(args):
    src_path, dst_desktop, dst_mobile = args
    try:
        with Image.open(src_path) as im:
            im = im.convert('RGB')
            # Desktop: 1600px wide (16:9 -> 1600x900)
            im_desk = im.resize((1600, 900), Image.Resampling.LANCZOS)
            im_desk.save(dst_desktop, format='WEBP', quality=78, method=2)
            
            # Mobile: 960px wide (16:9 -> 960x540)
            im_mob = im.resize((960, 540), Image.Resampling.LANCZOS)
            im_mob.save(dst_mobile, format='WEBP', quality=72, method=2)
        return True
    except Exception as e:
        print(f"Error processing {src_path}: {e}")
        return False

def get_dir_size_and_count(path):
    files = [os.path.join(path, f) for f in os.listdir(path) if f.endswith('.webp')]
    total_size = sum(os.path.getsize(f) for f in files)
    return len(files), total_size

def main():
    start_time = time.time()
    
    # 1. Output directories
    dirs = [
        os.path.join('assets', 'frames', 'hero'),
        os.path.join('assets', 'frames', 'hero-mobile'),
        os.path.join('assets', 'frames', 'dismantle'),
        os.path.join('assets', 'frames', 'dismantle-mobile'),
        os.path.join('assets', 'cars')
    ]
    for d in dirs:
        os.makedirs(d, exist_ok=True)
        
    # 2. Gather source files
    clip1_path = 'frames/hero section/clip 1' if os.path.exists('frames/hero section/clip 1') else 'clip 1 frames'
    clip2_path = 'frames/hero section/clip 2' if os.path.exists('frames/hero section/clip 2') else 'clip 2 frames'
    clip3_path = 'frames/hero section/clip 3' if os.path.exists('frames/hero section/clip 3') else 'clip 3 frames'
    dismantle_path = 'frames/dismantle' if os.path.exists('frames/dismantle') else 'flow clip frames'

    c1 = get_folder_files(clip1_path)
    c2 = get_folder_files(clip2_path)
    c3 = get_folder_files(clip3_path)
    dismantle_src = get_folder_files(dismantle_path)

    # Join hero clips
    hero_src = list(c1)
    if c1 and c2:
        if is_nearly_identical(c1[-1], c2[0]):
            print(f"Clip 2 first frame identical to Clip 1 last frame -> skipping {c2[0]}")
            hero_src.extend(c2[1:])
        else:
            hero_src.extend(c2)
            
    if hero_src and c3:
        if is_nearly_identical(hero_src[-1], c3[0]):
            print(f"Clip 3 first frame identical to previous last frame -> skipping {c3[0]}")
            hero_src.extend(c3[1:])
        else:
            hero_src.extend(c3)

    print(f"Hero source frames count: {len(hero_src)}")
    print(f"Dismantle source frames count: {len(dismantle_src)}")

    # Prepare batch tasks
    tasks = []
    
    # Hero tasks
    hero_desk_dir = os.path.join('assets', 'frames', 'hero')
    hero_mob_dir = os.path.join('assets', 'frames', 'hero-mobile')
    for i, src in enumerate(hero_src, 1):
        dst_d = os.path.join(hero_desk_dir, f"frame_{i:04d}.webp")
        dst_m = os.path.join(hero_mob_dir, f"frame_{i:04d}.webp")
        tasks.append((src, dst_d, dst_m))
        
    # Dismantle tasks
    dism_desk_dir = os.path.join('assets', 'frames', 'dismantle')
    dism_mob_dir = os.path.join('assets', 'frames', 'dismantle-mobile')
    for i, src in enumerate(dismantle_src, 1):
        dst_d = os.path.join(dism_desk_dir, f"frame_{i:04d}.webp")
        dst_m = os.path.join(dism_mob_dir, f"frame_{i:04d}.webp")
        tasks.append((src, dst_d, dst_m))

    total_tasks = len(tasks)
    print(f"Starting conversion of {total_tasks} frames with ProcessPoolExecutor...")
    
    workers = min(14, os.cpu_count() or 4)
    with ProcessPoolExecutor(max_workers=workers) as executor:
        results = list(executor.map(process_one_frame, tasks))
        
    success_count = sum(1 for r in results if r)
    elapsed = time.time() - start_time
    print(f"Finished {success_count}/{total_tasks} frames in {elapsed:.2f} seconds.")

    # Reporting
    hero_count, hero_size = get_dir_size_and_count(hero_desk_dir)
    hero_m_count, hero_m_size = get_dir_size_and_count(hero_mob_dir)
    dism_count, dism_size = get_dir_size_and_count(dism_desk_dir)
    dism_m_count, dism_m_size = get_dir_size_and_count(dism_mob_dir)

    print("\n--- RESULTS ---")
    print(f"assets/frames/hero: {hero_count} frames, {hero_size / (1024*1024):.2f} MB ({hero_size:,} bytes)")
    print(f"assets/frames/hero-mobile: {hero_m_count} frames, {hero_m_size / (1024*1024):.2f} MB ({hero_m_size:,} bytes)")
    print(f"assets/frames/dismantle: {dism_count} frames, {dism_size / (1024*1024):.2f} MB ({dism_size:,} bytes)")
    print(f"assets/frames/dismantle-mobile: {dism_m_count} frames, {dism_m_size / (1024*1024):.2f} MB ({dism_m_size:,} bytes)")

if __name__ == '__main__':
    main()

