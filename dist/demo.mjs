export const requirements = [
  "Supply and install a 6 kW rooftop solar array.",
  "Prepare and submit utility grid interconnection paperwork.",
  "Commission the system and provide a homeowner handover."
];
export const proposals = [
  {vendor:"BrightPeak Solar", price_minor:985000, lines:[
    "Supply and install a 6 kW rooftop solar array.",
    "Utility grid interconnection paperwork is excluded. The homeowner must prepare and submit it.",
    "System commissioning and homeowner handover included."
  ], review:{rows:[["INCLUDED",[1]],["EXCLUDED",[2]],["INCLUDED",[3]]]}},
  {vendor:"GridReady Energy", price_minor:1090000, lines:[
    "Supply and install a 6 kW rooftop solar array.",
    "Prepare and submit all utility grid interconnection paperwork on the homeowner's behalf.",
    "System commissioning and homeowner handover included, subject to the utility granting permission to operate."
  ], review:{rows:[["INCLUDED",[1]],["INCLUDED",[2]],["CONDITIONAL",[3]]]}}
];
export const demo = {
  scope:{rfq:"solar-rooftop",version:1,title:"Residential rooftop solar",currency:"USD",requirements,closed:true},
  quotes:proposals
};
