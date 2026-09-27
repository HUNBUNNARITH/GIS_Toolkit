// ================= Shared UTM <-> Lat/Lon (WGS84) =================
const A_ELL = 6378137.0, F_ELL = 1/298.257223563, K0 = 0.9996;

function latLonToUTM(lat, lon) {
  const e = Math.sqrt(F_ELL*(2-F_ELL)); const e2 = e*e; const ePrime2 = e2/(1-e2);
  let zone = Math.floor((lon+180)/6)+1;
  const lonOrigin = (zone-1)*6-180+3;
  const latR = lat*Math.PI/180, lonR = lon*Math.PI/180, lonOR = lonOrigin*Math.PI/180;
  const N = A_ELL/Math.sqrt(1-e2*Math.sin(latR)**2);
  const T = Math.tan(latR)**2, C = ePrime2*Math.cos(latR)**2, Aa = Math.cos(latR)*(lonR-lonOR);
  const M = A_ELL*((1-e2/4-3*e2*e2/64-5*e2**3/256)*latR - (3*e2/8+3*e2*e2/32+45*e2**3/1024)*Math.sin(2*latR) + (15*e2*e2/256+45*e2**3/1024)*Math.sin(4*latR) - (35*e2**3/3072)*Math.sin(6*latR));
  let easting = K0*N*(Aa + (1-T+C)*Aa**3/6 + (5-18*T+T*T+72*C-58*ePrime2)*Aa**5/120) + 500000;
  let northing = K0*(M + N*Math.tan(latR)*(Aa*Aa/2 + (5-T+9*C+4*C*C)*Aa**4/24 + (61-58*T+T*T+600*C-330*ePrime2)*Aa**6/720));
  const hemisphere = lat >= 0 ? 'N' : 'S';
  if (lat < 0) northing += 10000000;
  return { zone, hemisphere, easting, northing };
}
function utmToLatLon(zone, hemisphere, easting, northing) {
  const e = Math.sqrt(F_ELL*(2-F_ELL)); const e1sq = (e*e)/(1-e*e);
  const x = easting-500000; let y = northing; if (hemisphere==='S') y -= 10000000;
  const M = y/K0;
  const mu = M/(A_ELL*(1-e*e/4-3*e**4/64-5*e**6/256));
  const e1 = (1-Math.sqrt(1-e*e))/(1+Math.sqrt(1-e*e));
  const J1 = 3*e1/2-27*e1**3/32, J2 = 21*e1**2/16-55*e1**4/32, J3 = 151*e1**3/96, J4 = 1097*e1**4/512;
  const fp = mu + J1*Math.sin(2*mu) + J2*Math.sin(4*mu) + J3*Math.sin(6*mu) + J4*Math.sin(8*mu);
  const C1 = e1sq*Math.cos(fp)**2, T1 = Math.tan(fp)**2;
  const R1 = A_ELL*(1-e*e)/Math.pow(1-e*e*Math.sin(fp)**2,1.5);
  const N1 = A_ELL/Math.sqrt(1-e*e*Math.sin(fp)**2);
  const D = x/(N1*K0);
  const Q1 = N1*Math.tan(fp)/R1, Q2 = D*D/2;
  const Q3 = (5+3*T1+10*C1-4*C1*C1-9*e1sq)*D**4/24;
  const Q4 = (61+90*T1+298*C1+45*T1*T1-252*e1sq-3*C1*C1)*D**6/720;
  const lat = fp - Q1*(Q2-Q3+Q4);
  const Q5 = D, Q6 = (1+2*T1+C1)*D**3/6;
  const Q7 = (5-2*C1+28*T1-3*C1*C1+8*e1sq+24*T1*T1)*D**5/120;
  const lonOffset = (Q5-Q6+Q7)/Math.cos(fp);
  const lonOrigin = (zone-1)*6-180+3;
  return { lat: lat*180/Math.PI, lon: lonOrigin + lonOffset*180/Math.PI };
}
function ddToDMS(dd) {
  const sign = dd < 0 ? -1 : 1; dd = Math.abs(dd);
  const d = Math.floor(dd);
  const mFull = (dd - d) * 60;
  const m = Math.floor(mFull);
  const s = (mFull - m) * 60;
  return { d: d*sign, m, s };
}
function dmsToDD(d, m, s) {
  const sign = d < 0 ? -1 : 1;
  return sign * (Math.abs(d) + m/60 + s/3600);
}
function parseCoordLine(rawLine) {
  const parts = rawLine.trim().split(/[\s,]+/).filter(Boolean);
  if (parts.length === 0) throw new Error('Empty line');
  let zone, hemisphere, idx = 1;
  const zoneMatch = parts[0].match(/^(\d{1,2})([NnSs])$/);
  if (zoneMatch) {
    zone = parseInt(zoneMatch[1],10); hemisphere = zoneMatch[2].toUpperCase(); idx = 1;
  } else if (parts.length >= 4 && /^\d{1,2}$/.test(parts[0]) && /^[NnSs]$/.test(parts[1])) {
    zone = parseInt(parts[0],10); hemisphere = parts[1].toUpperCase(); idx = 2;
  }
  if (zone !== undefined) {
    const easting = parseFloat(parts[idx]); const northing = parseFloat(parts[idx+1]);
    if (isNaN(easting) || isNaN(northing)) throw new Error('Invalid UTM values in: "' + rawLine + '"');
    const { lat, lon } = utmToLatLon(zone, hemisphere, easting, northing);
    return { lat, lon, utm: { zone, hemisphere, easting, northing } };
  }
  if (parts.length >= 2) {
    const lat = parseFloat(parts[0]); const lon = parseFloat(parts[1]);
    if (!isNaN(lat) && !isNaN(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180) {
      const utm = latLonToUTM(lat, lon);
      return { lat, lon, utm };
    }
  }
  throw new Error('Could not read coordinate: "' + rawLine + '"');
}

// ================= Tabs =================
document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
  });
});

function row(label, value) { return `<div class="result-row"><span class="label">${label}</span><span class="value">${value}</span></div>`; }

// ================= Tab 1: Coordinates =================
document.getElementById('c_toUtmBtn').addEventListener('click', () => {
  const lat = parseFloat(document.getElementById('c_lat').value);
  const lon = parseFloat(document.getElementById('c_lon').value);
  const box = document.getElementById('c_toUtmResult');
  if (isNaN(lat) || isNaN(lon)) { box.innerHTML = '<div class="status warn">Enter valid latitude and longitude.</div>'; return; }
  const r = latLonToUTM(lat, lon);
  box.innerHTML = row('Zone', r.zone) + row('Hemisphere', r.hemisphere) + row('Easting', r.easting.toFixed(2)+' m') + row('Northing', r.northing.toFixed(2)+' m');
});
document.getElementById('c_toLLBtn').addEventListener('click', () => {
  const zone = parseInt(document.getElementById('c_zone').value,10);
  const hemisphere = document.getElementById('c_hemi').value;
  const easting = parseFloat(document.getElementById('c_easting').value);
  const northing = parseFloat(document.getElementById('c_northing').value);
  const box = document.getElementById('c_toLLResult');
  if (isNaN(zone) || isNaN(easting) || isNaN(northing)) { box.innerHTML = '<div class="status warn">Enter valid zone, easting and northing.</div>'; return; }
  const r = utmToLatLon(zone, hemisphere, easting, northing);
  box.innerHTML = row('Latitude', r.lat.toFixed(6)) + row('Longitude', r.lon.toFixed(6));
});
document.getElementById('dd_to_dms_btn').addEventListener('click', () => {
  const dd = parseFloat(document.getElementById('dms_dd').value);
  const box = document.getElementById('dmsResult');
  if (isNaN(dd)) { box.innerHTML = '<div class="status warn">Enter a decimal degree value.</div>'; return; }
  const r = ddToDMS(dd);
  box.innerHTML = row('DMS', `${r.d}° ${r.m}' ${r.s.toFixed(2)}"`);
});
document.getElementById('dms_to_dd_btn').addEventListener('click', () => {
  const d = parseFloat(document.getElementById('dms_d').value);
  const m = parseFloat(document.getElementById('dms_m').value);
  const s = parseFloat(document.getElementById('dms_s').value);
  const box = document.getElementById('dmsResult');
  if (isNaN(d) || isNaN(m) || isNaN(s)) { box.innerHTML = '<div class="status warn">Enter degrees, minutes and seconds.</div>'; return; }
  const dd = dmsToDD(d, m, s);
  box.innerHTML = row('Decimal degrees', dd.toFixed(6));
});
document.getElementById('batchConvertBtn').addEventListener('click', () => {
  const lines = document.getElementById('batchInput').value.split('\n').map(l => l.trim()).filter(Boolean);
  const out = document.getElementById('batchOutput');
  const results = [];
  for (const line of lines) {
    const parts = line.split(/[\s,]+/).filter(Boolean);
    const lat = parseFloat(parts[0]), lon = parseFloat(parts[1]);
    if (isNaN(lat) || isNaN(lon)) { results.push(`ERROR: "${line}"`); continue; }
    const r = latLonToUTM(lat, lon);
    results.push(`${r.zone}${r.hemisphere} ${r.easting.toFixed(2)} ${r.northing.toFixed(2)}`);
  }
  out.textContent = results.join('\n');
  out.style.display = 'block';
});
document.getElementById('batchCopyBtn').addEventListener('click', () => {
  const out = document.getElementById('batchOutput');
  if (!out.textContent) return;
  navigator.clipboard.writeText(out.textContent);
});

// ================= Tab 2: Area & Length =================
function getAreaPoints() {
  const lines = document.getElementById('areaInput').value.split('\n').map(l => l.trim()).filter(Boolean);
  const points = lines.map(l => parseCoordLine(l));
  const zones = new Set(points.map(p => p.utm.zone + p.utm.hemisphere));
  if (zones.size > 1) throw new Error('All points must be in the same UTM zone and hemisphere.');
  return points.map(p => p.utm);
}
document.getElementById('areaBtn').addEventListener('click', () => {
  const errEl = document.getElementById('areaError'); errEl.style.display = 'none';
  const resEl = document.getElementById('areaResults'); resEl.innerHTML = '';
  try {
    const pts = getAreaPoints();
    if (pts.length < 3) { errEl.textContent = 'Need at least 3 points for area.'; errEl.className = 'status warn'; errEl.style.display='block'; return; }
    let sum = 0;
    for (let i = 0; i < pts.length; i++) {
      const p1 = pts[i], p2 = pts[(i+1)%pts.length];
      sum += (p1.easting*p2.northing) - (p2.easting*p1.northing);
    }
    const sqm = Math.abs(sum)/2;
    resEl.innerHTML = row('Points used', pts.length) + row('Area', (sqm/10000).toFixed(4)+' ha') + row('Area', sqm.toFixed(2)+' m²') + row('Area', (sqm/4046.8564224).toFixed(4)+' acres');
  } catch (e) { errEl.textContent = e.message; errEl.className = 'status warn'; errEl.style.display='block'; }
});
document.getElementById('lengthBtn').addEventListener('click', () => {
  const errEl = document.getElementById('areaError'); errEl.style.display = 'none';
  const resEl = document.getElementById('areaResults'); resEl.innerHTML = '';
  try {
    const pts = getAreaPoints();
    if (pts.length < 2) { errEl.textContent = 'Need at least 2 points for length.'; errEl.className = 'status warn'; errEl.style.display='block'; return; }
    let total = 0; const rows = [];
    for (let i = 0; i < pts.length-1; i++) {
      const dx = pts[i+1].easting-pts[i].easting, dy = pts[i+1].northing-pts[i].northing;
      const d = Math.sqrt(dx*dx+dy*dy); total += d;
      rows.push(row(`Segment ${i+1}→${i+2}`, d.toFixed(2)+' m'));
    }
    resEl.innerHTML = row('Total length', total.toFixed(2)+' m') + rows.join('');
  } catch (e) { errEl.textContent = e.message; errEl.className = 'status warn'; errEl.style.display='block'; }
});

// ================= Tab 3: Export =================
function getExportFeatures() {
  const lines = document.getElementById('exportInput').value.split('\n').map(l => l.trim()).filter(Boolean);
  return lines.map((line, i) => {
    let name = 'Point' + (i+1), coordStr = line;
    if (line.includes('|')) {
      const [n, c] = line.split('|');
      name = n.trim() || name; coordStr = c.trim();
    }
    const { lat, lon } = parseCoordLine(coordStr);
    return { name, lat, lon };
  });
}

function showDownloadFallback(filename, content) {
  const preview = document.getElementById('exportPreview');
  preview.innerHTML =
    '<div class="status info">Direct download may be blocked on this platform. ' +
    'Copy the content below and save it as <strong>' + filename + '</strong>.</div>' +
    '<textarea id="fallbackContent" readonly style="min-height:160px; margin-top:8px;"></textarea>' +
    '<div class="btn-row"><button id="fallbackCopyBtn">Copy to Clipboard</button></div>';

  document.getElementById('fallbackContent').value = content;

  document.getElementById('fallbackCopyBtn').addEventListener('click', () => {
    navigator.clipboard.writeText(content).then(() => {
      const btn = document.getElementById('fallbackCopyBtn');
      btn.textContent = 'Copied!';
      setTimeout(() => { btn.textContent = 'Copy to Clipboard'; }, 1500);
    });
  });
}

function downloadFile(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  setTimeout(() => URL.revokeObjectURL(url), 10000);

  showDownloadFallback(filename, content);
}

document.getElementById('downloadKmlBtn').addEventListener('click', () => {
  const errEl = document.getElementById('exportError'); errEl.style.display = 'none';
  try {
    const feats = getExportFeatures();
    const placemarks = feats.map(f => `<Placemark><name>${f.name.replace(/[<&>]/g,'')}</name><Point><coordinates>${f.lon},${f.lat},0</coordinates></Point></Placemark>`).join('\n');
    const kml = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>Exported Points</name>\n${placemarks}\n</Document></kml>`;
    downloadFile('points.kml', kml, 'application/vnd.google-earth.kml+xml');
  } catch (e) { errEl.textContent = e.message; errEl.className = 'status warn'; errEl.style.display='block'; }
});
document.getElementById('downloadGeoJsonBtn').addEventListener('click', () => {
  const errEl = document.getElementById('exportError'); errEl.style.display = 'none';
  try {
    const feats = getExportFeatures();
    const geojson = {
      type: 'FeatureCollection',
      features: feats.map(f => ({ type: 'Feature', properties: { name: f.name }, geometry: { type: 'Point', coordinates: [f.lon, f.lat] } }))
    };
    downloadFile('points.geojson', JSON.stringify(geojson, null, 2), 'application/geo+json');
  } catch (e) { errEl.textContent = e.message; errEl.className = 'status warn'; errEl.style.display='block'; }
});

// ================= Tab 4: Unit converter =================
const AREA_TO_SQM = { sqm: 1, ha: 10000, sqkm: 1000000, acre: 4046.8564224, rai: 1600 };
document.getElementById('u_convertBtn').addEventListener('click', () => {
  const val = parseFloat(document.getElementById('u_value').value);
  const unit = document.getElementById('u_unit').value;
  const box = document.getElementById('unitResult');
  if (isNaN(val)) { box.innerHTML = '<div class="status warn">Enter a value.</div>'; return; }
  const sqm = val * AREA_TO_SQM[unit];
  box.innerHTML = row('Square meters', sqm.toFixed(2)+' m²') + row('Hectares', (sqm/AREA_TO_SQM.ha).toFixed(4)+' ha') + row('Square km', (sqm/AREA_TO_SQM.sqkm).toFixed(6)+' km²') + row('Acres', (sqm/AREA_TO_SQM.acre).toFixed(4)+' ac') + row('Rai', (sqm/AREA_TO_SQM.rai).toFixed(4)+' rai');
});
