import sys
import os

# Add the backend directory to sys.path so that 'app' and 'agent' modules can be imported
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
