"""Split the supplied recording at phrase boundaries verified against speech timing.
Usage: python3 scripts/split-looksay-voice.py /tmp/revivr-phrases.wav
The initial spoken 'Blank' is deliberately excluded. Source remains unchanged.
"""
import json,sys,wave
from pathlib import Path

phrases=['Water','Reposition me','Too warm','Too cold','Pain','Bathroom',"I'm okay",'Tired','Anxious','Happy','Frustrated','Yes','No','Thank you','Please wait','Come here','I love you','Needs board','Feelings board','Phrases board','Dwell time 0.8 seconds','Dwell time 1.2 seconds','Dwell time 1.6 seconds','Dwell time 2.2 seconds','Dwell time 3 seconds']
intervals=[(1.0,1.75),(1.75,2.86),(2.87,4.02),(4.15,5.19),(5.20,6.10),(6.10,7.18),(7.18,8.0),(8.0,8.95),(9.1,9.91),(9.92,10.64),(10.8,12.3),(12.3,12.98),(13.3,13.95),(14.15,15.35),(15.5,16.4),(16.8,17.72),(17.75,18.65),(18.77,19.77),(19.85,20.85),(20.9,21.9),(21.92,24.65),(24.65,26.64),(26.64,28.7),(28.7,30.79),(30.79,32.5)]
destination=Path(__file__).resolve().parents[1]/'public/lookandsay/assets/voice'
destination.mkdir(parents=True,exist_ok=True)
manifest=[]
with wave.open(sys.argv[1],'rb') as source:
    params=source.getparams()
    for number,(phrase,(start,end)) in enumerate(zip(phrases,intervals),1):
        filename=f'{number:02d}.wav'
        source.setpos(round(start*params.framerate))
        frames=source.readframes(round((end-start)*params.framerate))
        with wave.open(str(destination/filename),'wb') as output:
            output.setparams(params);output.writeframes(frames)
        manifest.append(dict(phrase=phrase,file=filename,start=start,end=end))
(destination/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print(f'Exported {len(manifest)} clips; Blank excluded.')
