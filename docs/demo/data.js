/* Fictional visits, generated entirely in the browser for the BestHistory public demo.
 * No browsing-history API, network call, cookies, or persistent storage. */
(() => {
  const DAY = 86400000;
  const now = Date.now();
  const daysAgo = (d, h = 12) => now - (d * DAY) - ((12 - h) * 3600000);
  const seed = [
    ['pixelconvert.example', 'PixelConvert', 'PDF & image conversion', ['pdf', 'tools', 'images'], 'Fast tool for turning PDF pages into PNG or JPG images.', ['Convert PDF to PNG online','Save each PDF page as an image','Batch image export guide'], 3],
    ['huegarden.example', 'HueGarden', 'Color inspiration', ['design', 'colors'], 'Color palettes and accessible UI color combinations.', ['Generate a harmonious color palette','Color combinations for a landing page','Accessibility contrast checker'], 12],
    ['deskflow.example', 'DeskFlow', 'Keyboard shortcuts', ['productivity', 'research'], 'A guide to useful keyboard shortcuts for focused work.', ['Keyboard shortcuts that save time','A better desktop productivity workflow','Keyboard navigation tips'], 6],
    ['atlasnotes.example','Atlas Notes','Research notes',['research','writing'],'Knowledge base for organizing useful reading.', ['Organize your research notes','Link ideas across projects','Capture ideas while reading'],4],
    ['quietfocus.example','Quiet Focus','Focus timer',['productivity'],'Minimal timer for deep work and planning.', ['Deep focus timer','Plan a Pomodoro session','Focus and recovery'],1],
    ['paperstack.example','Paperstack','Academic papers',['research','reading'],'Collect open-access research papers.', ['Search research papers','How to cite an article','Reading list'],17],
    ['draftly.example','Draftly','Writing assistant',['writing','ai'],'AI-powered writing outlines and editing prompts.', ['Draft a clear product email','Article outline ideas','Editing a blog post'],8],
    ['mintboard.example','MintBoard','Project kanban',['productivity','tools'],'Lightweight kanban task board.', ['Organize a weekly sprint','Project overview board','Workflow templates'],2],
    ['fontfield.example','FontField','Typography tools',['design'],'Compare font pairs for UI design.', ['Font pairing gallery','Typography readability guide','Variable fonts'],21],
    ['clipnest.example','ClipNest','Save web snippets',['research','reading'],'Small web clipping workspace.', ['Save useful links','Search saved highlights','Import bookmarks'],5],
    ['jsonharbor.example','JSON Harbor','Developer tools',['development','tools'],'Format, validate and compare JSON files.', ['JSON validator','Diff two JSON objects','Online JSON formatter'],14],
    ['codeharvest.example','CodeHarvest','Code examples',['development'],'Small reusable programming examples.', ['React component patterns','TypeScript utility functions','Frontend code recipes'],7],
    ['mapwander.example','MapWander','Trip planning',['travel'],'Find places and build lightweight travel lists.', ['Weekend city map','How to plan a walk','Organize travel stops'],11],
    ['langtrail.example','LangTrail','Language practice',['learning'],'Language learning vocabulary exercises.', ['Daily vocabulary practice','Listening drills','Learn useful phrases'],9],
    ['frameguide.example','FrameGuide','Photography guides',['photos','learning'],'Photo composition and workflow techniques.', ['Simple photography composition','Organize family photos','Light and exposure'],13],
    ['cloudwatcher.example','CloudWatcher','Weather forecasts',['weather'],'Read local forecasts and climate summaries.', ['Seven-day forecast','Radar maps','Weather explained'],15],
    ['chartcove.example','ChartCove','Data visualization',['development','design'],'Examples of interactive charts and dashboards.', ['Chart design principles','Bar chart examples','Data dashboard inspiration'],18],
    ['calmreads.example','Calm Reads','Read-later library',['reading'],'Longform essays and saved articles.', ['Essays on technology','Reading archive','Good weekend reads'],10],
    ['soundshore.example','SoundShore','Audio editor',['tools','media'],'Trim and edit podcast audio in a browser.', ['Trim an audio file','Podcast editing basics','Export MP3 recording'],23],
    ['openindex.example','OpenIndex','Open-source discovery',['development'],'Directory of useful open-source projects.', ['Discover productivity tools','Popular GitHub projects','Open-source directory'],20],
  ];
  const extraNames = [
    'NoteBridge','VectorTrail','QuickMarkup','NarrowCast','DailyMap','ScriptGarden','ClearTable','StudyLane','PromptField','VisualMint',
    'CodeRibbon','PaperLight','MemoryGrid','TravelCanvas','FocusHarbor','ImageWorkshop','TaskOrbit','WordFoundry','DevPocket','PanelCraft',
    'QuietReader','ProjectSail','PixelTrail','BlueNotebook','BuildDiary','ResearchDeck','IdeaCove','DesignAtlas','TextBridge','TinyCalc',
    'NotebookBay','LinkGarden','TimeJournal','CodePalette','ArticleNest','PageCanvas','Workboard','OpenSketch','StudyHarbor','DraftNest',
    'AppJournal','LearningNote','DailyClip','ProtoDock','WhiteBoard','FocusMint','StoryCraft','PhotoShelf','LanguageDeck','ColorAtlas',
    'BookmarkBay','ReadingTrail','WebCatalog','OutlineForge','CloudNotebook','IconValley','ClipGarden','WriterPort','PageNotebook','ResearchMint'
  ];
  const categories = [
    ['research','Research reference','research, notes and useful articles'],
    ['design','Design resource','ideas for a new interface'],
    ['development','Developer utility','helpful examples and tools'],
    ['productivity','Productivity tool','making work a little easier'],
    ['reading','Reading library','articles worth revisiting'],
    ['tools','Online utility','a practical web tool']
  ];
  for (let i = 0; i < extraNames.length; i++) {
    const n=extraNames[i], c=categories[i%categories.length];
    seed.push([`${n.toLowerCase()}.example`,n,c[1],[c[0]],`A website for ${c[2]}.`,[`Getting started with ${n}`,`${c[1]} overview`,`Practical examples and tips`],(i*7+16)%78+1]);
  }
  const records=[];
  const notes={};
  let count=0;
  for (let i=0;i<seed.length;i++){
    const [domain,name,category,tags,note,titles,days]=seed[i];
    notes[domain]={domain, name, category, tags:[...tags], note};
    for (let j=0;j<titles.length;j++) {
      const d=days + (j*3) + (i%3);
      const slug=titles[j].toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
      records.push({id:`visit-${++count}`,domain,url:`https://${domain}/${slug}`,title:titles[j],lastVisitTime:daysAgo(d,14-(j%4)*2),visitCount:1+(i+j)%12});
    }
  }
  window.BHDemoData={records,profiles:notes};
})();
