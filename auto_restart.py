import time
import subprocess
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler

class Watcher(FileSystemEventHandler):
    def on_modified(self, event):
        if event.src_path == 'analyze_obstacle.py':  
            print("File berubah, merestart skrip...")
            subprocess.run(['python3', 'analyze_obstacle.py'])

if __name__ == "__main__":
    path = '.'  
    event_handler = Watcher()
    observer = Observer()
    observer.schedule(event_handler, path, recursive=False)
    observer.start()

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()