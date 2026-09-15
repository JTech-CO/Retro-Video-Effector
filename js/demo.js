/* ========================================================================
 * RETRO VIDEO EFFECTOR                          DESKTOP EDITION / REV. 2.0
 * FILE    : DEMO.JS
 * MODULE  : TEST PATTERN GENERATOR
 * PURPOSE : PROCEDURAL DIAGNOSTIC FRAME / NO EXTERNAL IMAGE ASSET
 * REM     : VINTAGE SOURCE STYLE. MODERN BROWSER SERVICES REMAIN IN USE.
 * ======================================================================== */
function createRVEDemo()
{
    var canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 900;
    var c = canvas.getContext('2d');
    c.fillStyle = '#eae5da';
    c.fillRect(0, 0, 1200, 900);
    c.fillStyle = '#292d32';
    c.fillRect(0, 0, 1200, 85);
    c.font = 'bold 21px monospace';
    c.fillStyle = '#f0ede3';
    c.fillText('RETRO VIDEO EFFECTOR', 48, 52);
    c.font = '16px monospace';
    c.textAlign = 'right';
    c.fillText('DIAGNOSTIC TAPE / RVE-01', 1152, 51);
    c.textAlign = 'left';
    var colors = ['#eeeeec', '#e1d55c', '#69bfbe', '#66b381', '#bb6a95', '#cb725d', '#5d78b5'];
    colors.forEach(function (col, i)
    {
        c.fillStyle = col;
        c.fillRect(48 + i * 110, 123, 110, 288);
    });
    c.strokeStyle = '#292d32';
    c.lineWidth = 2;
    c.strokeRect(48, 123, 770, 288);
    var g = c.createLinearGradient(868, 123, 1147, 411);
    g.addColorStop(0, '#fdf7dd');
    g.addColorStop(.45, '#deac70');
    g.addColorStop(1, '#946d83');
    c.fillStyle = g;
    c.fillRect(866, 123, 286, 288);
    c.save();
    c.beginPath();
    c.rect(866, 123, 286, 288);
    c.clip();
    c.strokeStyle = '#3a5956';
    c.lineWidth = 18;
    c.beginPath();
    c.ellipse(1009, 259, 102, 105, 0, 0, 2 * Math.PI);
    c.stroke();
    c.strokeStyle = '#f8e5ba';
    c.lineWidth = 3;
    for (var i = 0; i < 14; i++)
    {
        c.beginPath();
        c.moveTo(900 + i * 18, 110);
        c.lineTo(850 + i * 18, 438);
        c.stroke();
    }
    c.restore();
    c.fillStyle = '#343a3c';
    c.font = '12px monospace';
    c.fillText('01  CHROMA / EDGE RESPONSE', 48, 437);
    c.fillText('02  CONTINUOUS TONE', 866, 437);
    for (var i = 0; i < 12; i++)
    {
        var v = Math.round(i * 255 / 11);
        c.fillStyle = `rgb(${v},${v},${v})`;
        c.fillRect(48 + i * 64.1667, 478, 65, 85);
    }
    c.strokeStyle = '#343a3c';
    c.strokeRect(48, 478, 770, 85);
    c.fillStyle = '#fff';
    c.fillRect(48, 615, 770, 143);
    c.save();
    c.beginPath();
    c.rect(48, 615, 770, 143);
    c.clip();
    c.strokeStyle = '#242729';
    for (var x = 48; x < 818; x += 3)
    {
        c.lineWidth = 1;
        c.beginPath();
        c.moveTo(x, 615);
        c.lineTo(48 + (x - 48) * 2.5, 758);
        c.stroke();
    }
    c.restore();
    c.fillStyle = '#343a3c';
    c.font = '12px monospace';
    c.fillText('03  GRAYSCALE / DETAIL', 48, 787);
    c.fillStyle = '#ce6c53';
    c.beginPath();
    c.arc(1009, 618, 124, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#f8f0d6';
    c.font = 'bold 53px monospace';
    c.textAlign = 'center';
    c.fillText('1994', 1009, 635);
    c.fillStyle = '#343a3c';
    c.font = '13px monospace';
    c.fillText('A SIGNAL, NOT A MODEL.', 1009, 785);
    c.textAlign = 'left';
    c.fillStyle = '#292d32';
    c.fillRect(0, 833, 1200, 67);
    c.fillStyle = '#f0ede3';
    c.font = '15px monospace';
    c.fillText('720 / 480 REFERENCE   ·   RGB > YIQ > RGB', 48, 873);
    c.textAlign = 'right';
    c.fillText('NO AI   /   LOCAL ONLY', 1152, 873);
    return canvas;
}
