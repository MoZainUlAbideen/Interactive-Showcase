// World data for the glade. All coordinates are in map pixels (map is 843 x 1264).
// Tip: open the site with ?debug at the end of the URL to see walkable ground and podium radii.
window.WORLD = {
  width: 843, height: 1264,
  spawn: [420, 648],   // where Zayn starts (feet position)

  // Ground Zayn can stand on. Everything outside these polygons is blocked.
  walk: [
    [[345,45],[472,45],[480,255],[500,398],[522,420],[522,602],[843,600],[843,690],[772,690],[762,800],[700,850],[690,892],[546,892],[546,1148],[482,1160],[482,1264],[328,1264],[322,1150],[300,1100],[298,1000],[300,930],[290,880],[226,830],[226,650],[150,640],[40,616],[40,572],[140,560],[140,440],[300,412],[340,400],[336,260]],
  ],

  // Obstacles carved out of the ground (statues, ruins, totems, bushes...).
  block: [
    { name: "shop pedestal", pts: [[203,444],[268,444],[270,512],[203,512]] },
    { name: "shop gems", pts: [[184,520],[226,520],[226,548],[184,548]] },
    { name: "power totem", pts: [[533,448],[573,448],[573,512],[533,512]] },
    { name: "skill totem", pts: [[283,690],[333,690],[333,745],[283,745]] },
    { name: "minimap board", pts: [[652,676],[700,690],[740,758],[732,798],[690,808],[624,778],[618,740]] },
    { name: "ruins", pts: [[522,395],[843,395],[843,595],[770,598],[700,592],[650,566],[608,546],[608,505],[575,470],[524,452]] },
    { name: "ferns", pts: [[470,258],[514,258],[514,306],[470,306]] },
    { name: "shrub", pts: [[748,544],[802,544],[802,596],[748,596]] },
    { name: "pink crystal", pts: [[566,832],[632,832],[632,882],[566,882]] },
    { name: "south rocks", pts: [[494,1100],[548,1100],[548,1136],[494,1136]] },
  ],

  // Podiums. (x, y) is the centre of the glowing pad.
  // active: true  -> opens a popup using the text with the same id in js/content.js
  // active: false -> shows a locked 'coming soon' hint
  pods: [
    { id: "about", label: "WHO AM I", x: 297, y: 515, active: true },
    { id: "experience", label: "EXPERIENCE", x: 551, y: 522, active: false },
    { id: "skills", label: "SKILLS", x: 307, y: 752, active: false },
    { id: "projects", label: "PROJECTS", x: 551, y: 752, active: false },
  ],

  // Soft pulsing light on crystals. kind: 'c' = cyan, 'p' = pink.
  glows: [
    {x:245,y:215,k:'c'}, {x:322,y:100,k:'c'}, {x:133,y:248,k:'c'}, {x:182,y:282,k:'c'}, {x:120,y:383,k:'c'}, {x:45,y:528,k:'c'}, {x:222,y:823,k:'c'}, {x:155,y:1042,k:'c'}, {x:255,y:995,k:'c'}, {x:100,y:905,k:'c'}, {x:772,y:1190,k:'c'}, {x:102,y:930,k:'c'}, {x:530,y:20,k:'c'}, {x:680,y:158,k:'c'}, {x:520,y:1115,k:'c'}, {x:665,y:235,k:'p'}, {x:582,y:850,k:'p'}
  ],
};
