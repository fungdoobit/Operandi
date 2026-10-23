# Restyle one of the creator's clean sample sheets (idle, walk) with kaela_style.
# usage: python3 -I restyle-sheet.py <in.png> <out.png>
import sys, os, numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from kaela_style import restyle
Image.fromarray(restyle(np.asarray(Image.open(sys.argv[1]).convert("RGBA")))).save(sys.argv[2])
