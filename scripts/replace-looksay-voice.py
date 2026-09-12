"""Import the user's corrected recordings, retaining a backup of replaced WAVs."""
import json,shutil,subprocess,tempfile,wave,sys
from pathlib import Path

source=Path(sys.argv[1]) if len(sys.argv)>1 else Path('/Users/einarjohnson/Downloads/Updated Voice Over Audio')
target=Path(__file__).resolve().parents[1]/'public/lookandsay/assets/voice'
manifest=json.loads((target/'manifest.json').read_text())
backup=Path(tempfile.mkdtemp(prefix='revivr-voice-backup-'))
shutil.copy2(target/'manifest.json',backup/'manifest.json')
replaced=[]
for entry in manifest:
    phrase=entry['phrase']
    candidates=[p for p in source.glob('*.mp3') if p.stem.casefold()==phrase.casefold()]
    # Verified with local speech recognition; the similarly named file says
    # "I'm feeling bored", not the navigation label.
    if phrase=='Feelings board' and (source/'Board.mp3').exists():candidates=[source/'Board.mp3']
    if not candidates:continue
    assert len(candidates)==1
    recording=candidates[0]
    output=target/entry['file']
    temporary=backup/('new-'+entry['file'])
    subprocess.run(['afconvert','-f','WAVE','-d','LEI16',str(recording),str(temporary)],check=True)
    with wave.open(str(temporary)) as audio:
        duration=audio.getnframes()/audio.getframerate()
        assert duration>0
    shutil.copy2(output,backup/entry['file'])
    shutil.copy2(temporary,output)
    entry.pop('start',None);entry.pop('end',None)
    entry.update(source=recording.name,sourceFolder=source.name,duration=round(duration,3),revision='2026-09-09')
    replaced.append(phrase)
(target/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Backup:',backup)
print('Replaced:',len(replaced),replaced)
print('Unchanged:',[e['phrase'] for e in manifest if e['phrase'] not in replaced])
