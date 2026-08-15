export const lguInfrastructureNodes = {
  binalbagan: [
    { id: 'node-ldrrmo', name: 'LDRRMO Command Center', type: 'ldrrmo', lat: 10.1938985, lng: 122.8586074, desc: 'Central Command & Dispatch' },
    { id: 'node-bfp', name: 'Bureau of Fire Protection (BFP)', type: 'bfp', lat: 10.1943826, lng: 122.8597694, desc: 'Fire & Rescue Station' },
    { id: 'node-infirmary', name: 'Municipal Infirmary', type: 'infirmary', lat: 10.1948501, lng: 122.8597670, desc: 'Primary Medical Facility' },
  ],
  cabanatuan: [
    { id: 'node-ldrrmo-cab', name: 'CDRRMO Command Center', type: 'ldrrmo', lat: 15.4708053, lng: 120.9519476, desc: 'Central Command & Dispatch' },
    { id: 'node-bfp-cab', name: 'Cabanatuan City Fire Station', type: 'bfp', lat: 15.4722208, lng: 120.9532117, desc: 'Fire & Rescue Station' },
    { id: 'node-infirmary-cab', name: 'M.V. Gallego General Hospital', type: 'infirmary', lat: 15.4764069, lng: 120.9577539, desc: 'Primary Medical Facility' },
  ]
};

export const getInfrastructureNodes = (subdomain: string, icons: any) => {
  const nodes = lguInfrastructureNodes[subdomain as keyof typeof lguInfrastructureNodes] || lguInfrastructureNodes['binalbagan'];
  return nodes.map(node => ({
    ...node,
    icon: icons[node.type]
  }));
};
