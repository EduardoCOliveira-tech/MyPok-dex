/* ========================
   1. CONFIGURAÇÃO DO FIREBASE
   ======================== */
const firebaseConfig = {
  apiKey: "AIzaSyDbJ97xe63rkG1YXag6Oqj7iQwm1tstjqo",
  authDomain: "mypokedex-27317.firebaseapp.com",
  projectId: "mypokedex-27317",
  storageBucket: "mypokedex-27317.firebasestorage.app",
  messagingSenderId: "63423489754",
  appId: "1:63423489754:web:efae4265a7a43515dc27e3"
};

// Inicializa o Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const firestore = firebase.firestore();

let currentUser = null;

/* ========================
   2. SISTEMA DE LOGIN (GOOGLE)
   ======================== */
function handleLogin() {
    const provider = new firebase.auth.GoogleAuthProvider();
    auth.signInWithPopup(provider)
        .then((result) => {
            currentUser = result.user;
            console.log("Logado como:", currentUser.displayName);
            showApp();
            loadUserData(currentUser.uid); // Busca dados da nuvem
        })
        .catch((error) => {
            console.error("Erro no login:", error);
            alert("Erro ao entrar: " + error.message);
        });
}

function logout() {
    auth.signOut().then(() => {
        currentUser = null;
        localStorage.removeItem('isGuest');
        location.reload(); 
    });
}

// Observador de Login (Mantém logado ao recarregar)
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        const loginBtn = document.querySelector('.login-btn');
        if(loginBtn) loginBtn.innerHTML = `👤 Olá, ${user.displayName.split(' ')[0]}`;

        // Entra no App
        showApp(); 
        
        // AGORA SIM: Carrega dados silenciosamente (true)
        // Isso garante que se você der F5, ele puxa os dados mais recentes da nuvem sem perguntar
        loadUserData(user.uid, true); 
    } else {
        currentUser = null;
    }
});

/* ========================
   3. SISTEMA DE SALVAR (LOCAL + NUVEM)
   ======================== */
function save() {
    // 1. Salva Localmente
    localStorage.setItem('poke_db_ultimate', JSON.stringify(db));
    localStorage.setItem('last_reg', currentRegId);

    // 2. Se logado, salva na Nuvem
    if (currentUser) {
        const cloudData = JSON.parse(JSON.stringify(db)); 
        cloudData.lastUpdated = new Date();

        firestore.collection("users").doc(currentUser.uid).set(cloudData)
            .then(() => { console.log("Salvo na nuvem."); })
            .catch((error) => console.error("Erro ao salvar na nuvem:", error));
    }
}

function loadUserData(userId, silent = false) {
    firestore.collection("users").doc(userId).get().then((doc) => {
        if (doc.exists) {
            const cloudData = doc.data();
            console.log("Dados da nuvem recebidos:", cloudData);
            
            // Lógica: Se for silencioso (F5) OU se o usuário confirmar (Login manual)
            if(silent || confirm("Encontrámos dados salvos na sua conta Google. Deseja carregar esse progresso?")) {
                db = cloudData; 
                delete db.lastUpdated; // Limpa timestamp interno
                
                // Garante integridade
                if (!db.teleports) db.teleports = {};
                if (!db.drawings) db.drawings = {};
                if (!db.captured) db.captured = {};
                if (!db.notes) db.notes = {};

                save(); // Salva no LocalStorage para ficar sincronizado
                
                // Atualiza a tela
                renderDex();
                updateStats();
                if(document.getElementById('view-map').classList.contains('active')) {
                   loadMapAssets();
                }
                
                // Só mostra o aviso se NÃO for silencioso (para não poluir a tela ao dar F5)
                if(!silent) showToast("Progresso sincronizado! 📥");
                else console.log("Sincronia silenciosa realizada com sucesso.");
            }
        } else {
            // Se não tem nada na nuvem, cria o registro inicial
            save(); 
        }
    }).catch((error) => console.log("Erro ao buscar:", error));
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast-msg';
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(() => { toast.remove(); }, 3000);
}

// ==========================================
// 4. CONFIGURAÇÃO DOS MAPAS
// ==========================================
const MAP_CONFIG = {
    "hgss_johto": {
        name: "HGSS - Johto",
        folder: "assetsHGSS/",
        file: "FullJohto.webp",
        width: 13712, height: 5893,
        overlays: [
            { src: "BellTowerRoute.webp", x: 3196, y: 690, w: 1800, h: 1200 },
            { src: "WhirlIslandsRoute.webp", x: 1680, y: 4600, w: 1600, h: 1250 },
            { src: "IceCaveRoute.webp", x: 8320, y: 386, w: 1533, h: 1145 },
            { src: "DarkCaveRoute.webp", x: 8039, y: 2288, w: 1100, h: 1630 },
            { src: "MtMortarRoute.webp", x: 4500, y: 0, w: 2600, h: 1900 },
            { src: "VictoryRoadRoute.webp", x: 12076, y: 2738, w: 1300, h: 2000 }
        ],
        portals: [
            { color: "#02cc1d", points: [[6641,2562, 6016,2517], [5938,2350, 6324,2339], [6532,2280, 6162,2276], [5873,2361, 6245,2364], [6388,2497, 6899,2498]] },
            { color: "#3270e3", points: [[6237,5275, 6964,3829], [6575,3603, 7039,5024], [6968,4446, 6319,5595]] },
            { color: "#e637e0", points: [[5805,5544, 6987,5832]] },
            { color: "#054d25", points: [[5148,5613, 5191,5369], [5142,4586, 4856,5448]] },
            { color: "#fc4e03", points: [[5172,1768, 2743,1574], [3194,1641, 3470,1790], [3372,1556, 3748,1563], [3844,1767, 4217,1772]] },
            { color: "#570c03", points: [[4911,1700, 4645,2277], [4757,2159, 4776,2455]] },
            { color: "#020445", points: [[7877,3209, 8150,3437], [8484,3162, 8166,3024]] },
            { color: "#04bbc4", points: [[9030,1925, 8454,1404], [9156,775, 9356,846], [9660,691, 8655,464]] },
            { color: "#13b091", points: [[2223,4128, 1870,4916], [2689,4116, 2466,4906], [2270,4486, 1812,5806], [2752,4510, 2954,5774]] },
            { color: "#024212", points: [[13415,3096, 13055,4550], [12623,3908, 12244,3602], [12762,2850, 13422,2910]] }
        ]
    },
    "hgss_kanto": {
        name: "HGSS - Kanto",
        folder: "assetsHGSS/",
        file: "FullKanto.webp",
        width: 9736, height: 6994,
        overlays: [
            { src: "RockTunnelRoute.webp", x: 8424, y: 1639, w: 900, h: 1100 },
            { src: "CeruleanCaveRoute.webp", x: 4582, y: 192, w: 3200, h: 700 },
            { src: "MtSilverRoute.webp", x: 0, y: 1440, w: 2100, h: 2000 },
            { src: "SeafoamIslandsRoute.webp", x: 3654, y: 4508, w: 864, h: 1961 },
            { src: "ViridianGymRoute.webp", x: 3541, y: 2958, w: 236, h: 621 }
        ],
        portals: [
            { color: "#704308", points: [[9296,2278, 8775,2111], [9001,1879, 9001,2375], [9144,1784, 9389,1695]] },
            { color: "#500678", points: [[5323,1194, 4248,836], [4536,1071, 5896,930]] },
            { color: "#a30f83", points: [[7307,914, 7437,734], [7538,340, 6501,332], [7538,480, 5487,453]] },
            { color: "#09bd3f", points: [[3197,2549, 3979,2772], [3659,1751, 3103,1711]] },
            { color: "#6385b8", points: [[4678,6797, 4363,6397], [4455,6701, 4071,6397]] },
            { color: "#bbc1c9", points: [[169,3420, 717,3260], [501,1520, 782,1371]] }
        ]
    },
    "frlg_kanto": {
        name: "FRLG - Kanto",
        folder: "assetsFRLG/",
        file: "FullKanto.png",
        width: 7700, height: 6400,
        overlays: [
            { src: "FullKantoPaths.png", x: 0, y: 0, w: 7700, h: 6400 }
        ],
        portals: [
            { color: "#088a26", points: [[1050,2411, 545,4516], [159,3674, 1050,1807]] },
            { color: "#e9f01d", points: [[2799,879, 1997,676], [2204,341, 3182,273], [2907,512, 3504,561], [2009,310, 2770,356], [2641,370, 3728,241], [1787,182, 2512,272], [2813,511, 3633,401], [3314,228, 2963,359], [3060,359, 3008,879]] },
            { color: "#c91038", points: [[4719,1774, 5006,2336], [4960,3249, 4719,2766]] },
            { color: "#1643d9", points: [[4594,3729, 5296,3974], [5018,4088, 5040,3729], [5024,4260, 4847,4162], [5422,4239, 5813,4202], [5015,3876, 4860,3971]] },
            { color: "#ed841a", points: [[6273,1103, 6307,184], [6753,183, 7421,602], [7342,200, 6095,184], [6352,359, 7244,344], [6844,200, 6754,488], [6320,751, 6270,1711]] },
            { color: "#360f8a", points: [[5198,2142, 4166,1845], [2965,1862, 3949,2301]] },
            { color: "#db1281", points: [[3419,2252, 2671,2602], [2791,2611, 2975,3166], [2863,3176, 3278,2601], [3198,2864, 3222,3263], [2890,3325, 2755,3058], [3455,4876, 6267,5991], [6654,5767, 6734,5726], [6733,5456, 6700,5364], [6299,5489, 6268,5519], [6138,5484, 5635,5332], [5978,5485, 5524,5328], [5782,5752, 5861,5798]] },
            { color: "#51118c", points: [[6430,2174, 6819,2873]] },
            { color: "#f8fc05", points: [[6251,1443, 5400,1857]] },
            { color: "#13a1f2", points: [[2303,6207, 3752,5966], [3816,5712, 4411,5714], [4153,5681, 4746,5682], [4106,5922, 4698,5924], [4361,5667, 3752,6066], [4521,5761, 3914,6146], [4760,5841, 4154,6226], [4648,5922, 4042,6307], [4697,5746, 4101,6149], [3753,6274, 4394,6226], [4154,6066, 4761,6067], [4137,6274, 4761,6259], [4457,6145, 5113,6162], [4729,6082, 5386,6099], [2496,6303, 4170,5963]] },
            { color: "#6b0619", points: [[1088,6134, 1480,6046], [1524,5719, 1431,5109], [1506,5106, 2134,5777], [1505,4929, 2086,5649], [2502,5889, 1904,5237], [2274,5873, 1665,5869], [1737,5948, 3138,5960]] },
            { color: "#a211bf", points: [[4591,2286, 3522,4426], [3268,4488, 3666,3660], [3060,4487, 4163,4470], [3139,4695, 3570,3785], [3555,4694, 3795,3482], [3698,4487, 3874,4138], [3667,4616, 3779,3132], [3843,4614, 3715,3769], [4098,4615, 4146,4710], [3684,4711, 3669,4346], [3315,4120, 3138,3801], [3219,4168, 4019,2973], [3315,4250, 4083,2895], [3060,4346, 4083,3022], [4163,4103, 4036,3978], [3796,4345, 3987,3357], [3714,3833, 3891,2491], [3666,3579, 3813,3547]] },
            { color: "#0dba16", points: [[78,928, 563,727], [435,429, 804,344], [1332,343, 1330,696], [869,585, 837,248], [1333,842, 1338,506], [1361,472, 1412,824], [1379,712, 1394,344], [1553,402, 287,928]] },
            { color: "#c3c7c9", points: [[1008,1216, 752,1336]] },
            { color: "#1ed4c8", points: [[4719,974, 4987,781]] },
            { color: "#e3b510", points: [[4449,3600, 4427,3977]] },
            { color: "#08781d", points: [[3055,2400, 2828,2556]] },
            { color: "#a40ac7", points: [[3214,5311, 2999,5475]] },
            { color: "#f21124", points: [[1279,6142, 883,6334]] },
            { color: "#50de71", points: [[1344,3038, 1718,3098]] },
            { color: "#0a0a0a", points: [[4702,1995, 5033,2148]] },
            { color: "#5721c2", points: [[4799,1999, 5004,1888], [5068,1843, 5228,1892], [5227,1842, 5228,1716], [5101,1845, 5228,1587], [5101,1892, 4906,1842], [5226,1763, 4779,1716], [5098,1763, 4969,1587], [5098,1716, 5098,1587], [5227,1636, 4779,1845], [5098,1636, 4778,1588], [5035,1636, 4783,1892], [5035,1590, 4907,1589], [4972,1636, 4907,1715], [4779,1764, 4907,1637], [4907,1764, 4907,1892], [5067,1764, 4779,1637]] }
        ]
    },
    "emerald_hoenn": {
        name: "Emerald - Hoenn",
        folder: "assetsEmerald/",
        file: "FullHoenn.webp",
        width: 12800, height: 6408,
        overlays: [
            { src: "GraniteCaveRoute.webp", x: 638, y: 4508, w: 941, h: 1128 },
            { src: "NewMauvilleRoute.webp", x: 2539, y: 2759, w: 660, h: 660 },
            { src: "MeteorFallsRoute.webp", x: 637, y: 1442, w: 1921, h: 962 },
            { src: "MagmaHideoutRoute.webp", x: 3842, y: 2760, w: 2470, h: 1030 },
            { src: "AquaHideoutRoute.webp", x: 8537, y: 755, w: 1788, h: 547 },
            { src: "SeafloorCavernRoute.webp", x: 8723, y: 3682, w: 1705, h: 774 },
            { src: "VictoryRoadRoute.webp", x: 12045, y: 1300, w: 736, h: 1751 },
            { src: "CurrentsRoute.webp", x: 4000, y: 4400, w: 3600, h: 550 }
        ],
        portals: [
            { color: "#138030", points: [[160,3689, 872,3783], [512,3750, 1194,3783], [842,3257, 164,3561]] },
            { color: "#820c18", points: [[1390,2236, 1385,2610], [1677,2269, 1612,2774], [2046,2446, 1787,2708]] },
            { color: "#37488a", points: [[767,5885, 1474,5585], [1155,5561, 721,5297], [1103,5295, 1104,4862], [1119,4733, 1119,5167], [1057,5167, 1442,5433], [963,5555, 752,5449], [781,5036, 783,4606], [848,5006, 848,4572], [1119,4992, 1121,4558]] },
            { color: "#138fe8", points: [[2701,6045, 1831,5892], [1812,5741, 1864,5618], [1826,5808, 2580,5131], [2620,5092, 2594,5278], [2667,5092, 2738,5278], [2620,5007, 2575,4822], [2667,5007, 2719,4822], [2706,4986, 2309,5490], [2491,5092, 2451,5282], [2491,5009, 2430,4826], [2452,5132, 1746,5806], [2216,5522, 2114,5431], [2262,5522, 2256,5431], [2343,5522, 2401,5431], [2247,5576, 2116,5650], [2297,5576, 2261,5650], [2343,5576, 2404,5650], [2180,5486, 2531,4990], [2787,5593, 2595,5770], [2834,5593, 2837,5770], [2883,5593, 3077,5770], [2785,5520, 2589,5338], [2834,5520, 2828,5338], [2881,5520, 3070,5338], [2260,5752, 2763,5894], [2343,5913, 2518,5844], [2340,5866, 2741,5632]] },
            { color: "#0A09F6", points: [[3689,4773, 3853,4713]] },
            { color: "#901ad9", points: [[3375,3808, 2963,4366]] },
            { color: "#deed0c", points: [[3758,3135, 3052,3279]] },
            { color: "#d15c0f", points: [[2733,1086, 3114,2082], [3114,1569, 2909,669]] },
            { color: "#8f3e09", points: [[3011,944, 2047,1083], [1494,522, 2090,1159], [1509,1155, 2660,1256]] },
            { color: "#ed0911", points: [[1535,799, 4000,3308], [4238,3306, 4531,2769], [4579,3106, 5453,3694], [5872,3406, 4337,2801], [4676,3277, 5272,2924], [5240,3021, 5088,3645], [5017,3224, 6100,2953], [5685,3189, 4097,3712], [4098,3377, 4633,3626], [4633,3421, 4162,3104]] },
            { color: "#8e917d", points: [[766,1198, 1067,1738], [796,1484, 1283,2071], [1460,1969, 1901,1742], [1695,1602, 1188,1826], [1236,1922, 1727,1682], [1933,2089, 1053,1885], [1883,1548, 2322,2366], [1662,1876, 716,1506], [1662,1876, 716,1506], [702,1469, 2239,2073], [429,1423, 731,2075]] },
            { color: "#5b5fc7", points: [[4574,706, 4307,885], [4428,707, 4428,529]] },
            { color: "#2fe612", points: [[6991,1555, 7554,1197]] },
            { color: "#ae77ed", points: [[7071,2254, 7069,4096], [6848,3905, 7364,4025], [6951,2926, 6953,3148], [7124,3167, 7124,3377], [6965,3376, 6953,3584], [7030,3585, 7030,3796]] },
            { color: "#0812a3", points: [[8795,1392, 8727,1258], [8871,832, 9422,766], [9393,816, 9007,994], [9455,816, 9390,944], [9006,1072, 9678,799], [9470,1057, 9278,816], [9247,767, 10071,766], [10067,961, 9971,961], [10275,880, 9859,880], [9831,798, 9009,799], [9154,767, 9975,766], [9907,880, 10276,1025], [9631,833, 9726,896], [9678,833, 9662,770], [9725,833, 9631,896], [9678,896, 9678,961], [9631,961, 9726,1024], [9726,961, 9692,770], [9631,1024, 9325,913], [9678,1024, 9678,925], [10290,1073, 9484,816]] },
            { color: "#4ccbd9", points: [[10577,1440, 10779,1062], [10605,1440, 11340,1062], [10762,646, 10829,468], [10762,387, 12070,333], [10893,238, 11892,569], [11955,440, 10956,62], [10588,222, 11877,180], [11800,251, 10523,293], [12214,323, 12540,307], [11118,600, 11247,533], [11664,532, 11456,600]] },
            { color: "#0b5e85", points: [[11262,2017, 11498,2187]] },
            { color: "#03DAF8", points: [[9174,1678, 9078,5519], [9672,1725, 9568,5573], [9029,5057, 9127,1213], [9444,1644, 9348,5484], [9347,6034, 9447,2189], [9128,2124, 9026,5967], [10008,1676, 9913,5520], [9913,5313, 10010,1471], [10056,1309, 9960,5154], [10088,2174, 10008,6019], [9878,5819, 9975,1981], [9849,2074, 9749,5918], [9701,6143, 9798,2300], [9385,2460, 10570,5023], [10317,5039, 9127,2477], [11336,3310, 12534,5237], [12601,5138, 11399,3213], [9113,3516, 10301,6079], [10843,3996, 12011,5918], [11655,5056, 10453,3125], [11926,5494, 10743,3532], [12241,4967, 11035,3063], [12580,4601, 11382,2644], [12596,5948, 11404,4022]] },
            { color: "#ECA609", points: [[12047,6038, 8802,4297], [8816,4030, 9204,3928], [8994,4221, 8785,3687], [8833,3961, 9189,4155], [8961,3880, 9108,4012], [9141,3817, 9515,4424], [9109,3977, 9254,4011], [9204,4252, 8828,4297], [9221,3814, 9388,4049], [9564,4202, 8852,4297], [9402,4088, 9794,4277], [9418,3682, 9875,4244], [9859,4037, 9854,3993], [9852,3818, 10075,3751]] },
            { color: "#c97d18", points: [[12446,3710, 12282,2976], [12187,2553, 12173,1861], [12522,2215, 12522,1698], [12717,2214, 12715,2938], [12732,1328, 12715,1847], [12314,2071, 12349,1491], [12123,2231, 12124,1713], [12361,2147, 12380,2842], [12668,2419, 12446,3486]] },
            { color: "#5e120c", points: [[432,2419, 688,2707]] },
            { color: "#23b8ae", points: [[1089,6226, 751,6387]] },
            { color: "#d2e00d", points: [[3326,2510, 3185,2473]] },
            { color: "#db1d26", points: [[2319,1394, 1904,1485], [1850,1490, 2128,1490], [1818,1348, 2096,1348], [1689,1476, 1969,1476], [1984,1427, 1705,1427], [2049,1427, 1771,1427], [1690,1363, 1969,1363], [1969,1300, 1690,1300], [1722,1250, 2000,1250], [2080,1236, 1801,1235], [1850,1299, 2128,1299], [2160,1395, 1881,1395], [1880,1250, 2160,1250]] },
            { color: "#f2db7e", points: [[878,4001, 1638,3998]] },
            { color: "#04400c", points: [[5472,369, 5575,873]] },
            { color: "#1a6347", points: [[11316,1851, 10845,1919], [11231,1826, 11535,1682], [11264,1746, 11230,1664], [11326,1584, 11344,1488], [11360,1585, 11582,1616], [11391,1856, 11390,1345], [11423,1808, 11551,1458], [11551,1394, 11325,1777]] },
            { color: "#05255c", points: [[8496,3248, 8346,2719]] }
        ]
    }
};

// ==========================================
// 5. DADOS & ESTADO
// ==========================================
const BACKUP_DATA = [
    {id:1,name:"bulbasaur",types:["grass","poison"],stats:{hp:45,atk:49,def:49,spa:65,spd:65,spe:45},evo:16},
    {id:4,name:"charmander",types:["fire"],stats:{hp:39,atk:52,def:43,spa:60,spd:50,spe:65},evo:16},
    {id:7,name:"squirtle",types:["water"],stats:{hp:44,atk:48,def:65,spa:50,spd:64,spe:43},evo:16}
];

let dataSource = [];
if (typeof POKEMON_DATA !== 'undefined' && Array.isArray(POKEMON_DATA)) {
    dataSource = POKEMON_DATA;
} else if (typeof POKEMON_DB !== 'undefined' && Array.isArray(POKEMON_DB)) {
    dataSource = POKEMON_DB;
} else {
    dataSource = BACKUP_DATA;
}

// Carrega dados locais ou inicia vazio
let db = JSON.parse(localStorage.getItem('poke_db_ultimate')) || { captured: {}, drawings: {}, notes: {}, teleports: {} };
if (!db.teleports) db.teleports = {};
if (!db.drawings) db.drawings = {};
if (!db.notes) db.notes = {};
if (!db.captured) db.captured = {};

let currentRegId = 'hgss_johto'; 
let loadedImages = { main: null, overlays: [] };

// Variáveis do Canvas
let canvas = document.getElementById('canvas');
let ctx = canvas.getContext('2d');
let view = { x: -2000, y: -1000, scale: 0.3 }; 
let isDrag = false, isDraw = false, tool = 'move';
let lastPos = { x: 0, y: 0 };
let currentPath = [];

// ==========================================
// 6. INICIALIZAÇÃO
// ==========================================
window.onload = () => {
    // Verifica Landing Page
    const isGuest = localStorage.getItem('isGuest');
    if (isGuest === 'true') {
        showApp();
    } else {
        document.getElementById('landing-page').style.display = 'flex';
    }

    // Tenta recuperar última região salva
    const lastReg = localStorage.getItem('last_reg');
    if (lastReg && (MAP_CONFIG[lastReg] || (typeof REGIONS_DB !== 'undefined' && REGIONS_DB.find(r => r.id === lastReg)))) {
        currentRegId = lastReg;
    } else {
        if(typeof REGIONS_DB !== 'undefined' && REGIONS_DB.length > 0) currentRegId = REGIONS_DB[0].id;
    }
    
    // Configura UI inicial
    initCanvas();
    const isMapMode = document.getElementById('view-map').classList.contains('active');
    ensureValidId(isMapMode ? 'map' : 'dex'); 
    populateRegionSelect();
    
    if(isMapMode) {
        loadMapAssets();
    } else {
        renderDex();
        updateStats();
    }
    
    // Sincroniza select visualmente
    const sel = document.getElementById('region-select');
    if(sel) sel.value = currentRegId;
};

// Funções de UI (Landing Page)
function enterAsGuest() {
    localStorage.setItem('isGuest', 'true');
    showApp();
}

function showApp() {
    const landing = document.getElementById('landing-page');
    const app = document.getElementById('app-container');
    
    landing.style.opacity = '0';
    setTimeout(() => {
        landing.style.display = 'none';
        app.style.display = 'flex'; 
        window.dispatchEvent(new Event('resize'));
    }, 300);
}

// ==========================================
// 7. FUNÇÕES AUXILIARES
// ==========================================
function ensureValidId(mode) {
    if (mode === 'map') {
        if(!MAP_CONFIG[currentRegId]) {
            if(currentRegId === 'kanto_rb') currentRegId = 'frlg_kanto';
            else if(currentRegId === 'johto_gs') currentRegId = 'hgss_johto';
            else if(currentRegId === 'hoenn_rs') currentRegId = 'emerald_hoenn';
            else currentRegId = 'hgss_johto'; 
        }
    } else {
        const isDexId = typeof REGIONS_DB !== 'undefined' && REGIONS_DB.some(r => r.id === currentRegId);
        if(!isDexId) {
            if(currentRegId === 'frlg_kanto') currentRegId = 'kanto_rb';
            else if(currentRegId.startsWith('hgss_')) currentRegId = 'johto_gs'; 
            else if(currentRegId === 'emerald_hoenn') currentRegId = 'hoenn_rs';
            else if(typeof REGIONS_DB !== 'undefined') currentRegId = REGIONS_DB[0].id;
        }
    }
    localStorage.setItem('last_reg', currentRegId);
}

function populateRegionSelect() {
    const sel = document.getElementById('region-select');
    sel.innerHTML = '';
    const isMapMode = document.getElementById('view-map').classList.contains('active');

    if (isMapMode) {
        Object.keys(MAP_CONFIG).forEach(key => {
            const opt = document.createElement('option');
            opt.value = key;
            opt.innerText = MAP_CONFIG[key].name;
            if(key === currentRegId) opt.selected = true;
            sel.appendChild(opt);
        });
    } else {
        if (typeof REGIONS_DB !== 'undefined') {
            REGIONS_DB.forEach(r => {
                const opt = document.createElement('option');
                opt.value = r.id; 
                opt.innerText = r.name;
                if(r.id === currentRegId) opt.selected = true;
                sel.appendChild(opt);
            });
        }
    }
}

function changeRegion() {
    const sel = document.getElementById('region-select');
    if(!sel.value) return;
    
    currentRegId = sel.value;
    save(); // Salva estado

    const isMapMode = document.getElementById('view-map').classList.contains('active');
    
    if(isMapMode) {
        if(MAP_CONFIG[currentRegId]) {
            loadMapAssets();
        }
    } else {
        if (!db.captured[currentRegId]) db.captured[currentRegId] = [];
        renderDex();
    }
}

function setTab(mode) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`view-${mode}`).classList.add('active');
    event.target.classList.add('active');
    
    ensureValidId(mode);
    populateRegionSelect();
    
    if (mode === 'map') {
        resizeCanvas();
        loadMapAssets();
    } else {
        renderDex();
        updateStats();
    }
}

// ==========================================
// 8. PESQUISA
// ==========================================
function searchPokemon(event) {
    if (event.key === 'Enter') executeSearch();
}

function executeSearch() {
    const input = document.getElementById('poke-search');
    const term = input.value.trim().toLowerCase();
    
    if (!term) return;

    const found = dataSource.find(p => 
        p.name.toLowerCase() === term || 
        p.id.toString() === term
    );

    if (found) {
        openModal(found); 
        input.value = ''; 
        input.blur(); 
    } else {
        alert("Pokémon não encontrado na base de dados (Verifique se o nome está em inglês).");
    }
}

// ==========================================
// 9. MAPAS (Lógica Ironmon)
// ==========================================
function loadMapAssets() {
    const config = MAP_CONFIG[currentRegId];
    if(!config) return;

    loadedImages = { main: new Image(), overlays: [] };
    const folder = config.folder || "assets/";

    loadedImages.main.src = folder + config.file;
    loadedImages.main.onload = () => draw();

    if(config.overlays) {
        config.overlays.forEach(ov => {
            const img = new Image();
            img.src = folder + ov.src;
            loadedImages.overlays.push({ img: img, x: ov.x, y: ov.y, w: ov.w, h: ov.h });
            img.onload = () => draw();
        });
    }
    draw();
}

function initCanvas() {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousedown', startInteract);
    canvas.addEventListener('mousemove', moveInteract);
    canvas.addEventListener('mouseup', endInteract);
    canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const zoomIntensity = 0.1;
        const wheel = e.deltaY < 0 ? 1 : -1;
        const zoom = Math.exp(wheel * zoomIntensity);
        const mx = (e.offsetX - view.x) / view.scale;
        const my = (e.offsetY - view.y) / view.scale;
        view.scale *= zoom;
        view.x -= mx * (zoom - 1) * view.scale;
        view.y -= my * (zoom - 1) * view.scale;
        draw();
    });
}

function resizeCanvas() {
    const c = document.getElementById('map-container');
    if(c) { canvas.width = c.clientWidth; canvas.height = c.clientHeight; draw(); }
}

function draw() {
    ctx.fillStyle = '#111'; ctx.fillRect(0, 0, canvas.width, canvas.height);
    const config = MAP_CONFIG[currentRegId];
    if(!config) return;

    ctx.save();
    ctx.translate(view.x, view.y);
    ctx.scale(view.scale, view.scale);

    if(loadedImages.main && loadedImages.main.complete) ctx.drawImage(loadedImages.main, 0, 0, config.width, config.height);

    loadedImages.overlays.forEach(obj => { if(obj.img.complete) ctx.drawImage(obj.img, obj.x, obj.y, obj.w, obj.h); });

    if(config.portals) {
        ctx.lineWidth = 4;
        config.portals.forEach(group => {
            ctx.strokeStyle = group.color; ctx.fillStyle = group.color;
            group.points.forEach(pair => {
                if(pair.length === 4) { ctx.beginPath(); ctx.moveTo(pair[0], pair[1]); ctx.lineTo(pair[2], pair[3]); ctx.stroke(); drawDot(pair[0], pair[1]); drawDot(pair[2], pair[3]); } 
                else if(pair.length === 2) { drawDot(pair[0], pair[1]); }
            });
        });
    }

    if (db.drawings && db.drawings[currentRegId]) {
        db.drawings[currentRegId].forEach(d => {
            ctx.beginPath(); ctx.strokeStyle = d.color; ctx.lineWidth = d.width / view.scale;
            if (d.points.length) { ctx.moveTo(d.points[0].x, d.points[0].y); d.points.forEach(p => ctx.lineTo(p.x, p.y)); }
            ctx.stroke();
        });
    }

    if (currentPath.length) {
        ctx.beginPath(); ctx.strokeStyle = document.getElementById('color').value; ctx.lineWidth = 5 / view.scale;
        ctx.moveTo(currentPath[0].x, currentPath[0].y); currentPath.forEach(p => ctx.lineTo(p.x, p.y)); ctx.stroke();
    }

    if(db.teleports && db.teleports[currentRegId]) {
        db.teleports[currentRegId].forEach(t => {
            const size = 20 / view.scale;
            ctx.beginPath(); ctx.arc(t.x, t.y, size, 0, Math.PI*2); ctx.fillStyle = 'rgba(0,188,212,0.8)'; ctx.fill();
            ctx.strokeStyle = 'white'; ctx.lineWidth = 2 / view.scale; ctx.stroke();
            if(t.name) { ctx.fillStyle = 'white'; ctx.font = `${24/view.scale}px Arial`; ctx.textAlign = 'center'; ctx.fillText(t.name, t.x, t.y - size - 5); }
        });
    }
    ctx.restore();
}

function drawDot(x, y) { ctx.beginPath(); ctx.arc(x, y, 15, 0, Math.PI*2); ctx.fill(); }

// INTERAÇÃO
function startInteract(e) {
    const mx = (e.offsetX - view.x) / view.scale;
    const my = (e.offsetY - view.y) / view.scale;
    if (tool === 'tele') {
        const name = prompt("Nome do local:");
        if(name) {
            if(!db.teleports[currentRegId]) db.teleports[currentRegId] = [];
            db.teleports[currentRegId].push({x: mx, y: my, name: name});
            save(); draw();
        }
        return;
    }
    if (tool === 'move') isDrag = true;
    if (tool === 'draw') { isDraw = true; currentPath = [{x: mx, y: my}]; }
    lastPos = {x: e.offsetX, y: e.offsetY};
}
function moveInteract(e) {
    if (isDrag) { view.x += e.offsetX - lastPos.x; view.y += e.offsetY - lastPos.y; lastPos = {x: e.offsetX, y: e.offsetY}; draw(); }
    if (isDraw) { const mx = (e.offsetX - view.x) / view.scale; const my = (e.offsetY - view.y) / view.scale; currentPath.push({x: mx, y: my}); draw(); }
}
function endInteract() {
    isDrag = false;
    if (isDraw) {
        isDraw = false;
        if (currentPath.length) {
            if (!db.drawings[currentRegId]) db.drawings[currentRegId] = [];
            db.drawings[currentRegId].push({ color: document.getElementById('color').value, width: 5, points: currentPath }); save();
        }
        currentPath = []; draw();
    }
}
function setTool(t) { tool = t; document.querySelectorAll('.tool').forEach(b => b.classList.remove('active')); document.getElementById('t-'+t).classList.add('active'); }
function undo() { if(db.drawings[currentRegId]?.length){ db.drawings[currentRegId].pop(); save(); draw(); } }
function clearMap() { if(confirm("Limpar desenhos e marcas desta região?")){ db.drawings[currentRegId]=[]; db.teleports[currentRegId]=[]; save(); draw(); } }

// ==========================================
// 10. DEX & DETALHES
// ==========================================
function renderDex() {
    const grid = document.getElementById('grid');
    grid.innerHTML = '';
    
    let config = (typeof REGIONS_DB !== 'undefined') ? REGIONS_DB.find(r => r.id === currentRegId) : null;
    
    if(!config) {
        grid.innerHTML = '<div style="color:#aaa; text-align:center; padding:50px;">Selecione uma região da lista acima para ver os Pokémon.</div>';
        return;
    }

    const fragment = document.createDocumentFragment();
    for (let i = config.start; i <= config.end; i++) {
        const d = document.createElement('div');
        const isCaptured = db.captured[currentRegId]?.includes(i);
        d.className = 'card ' + (isCaptured ? 'captured' : '');
        
        const localData = dataSource.find(p => p.id === i);
        const name = localData ? localData.name : `Pokémon #${i}`;
        const imgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${i}.png`;

        d.innerHTML = `
            <div class="info-btn" title="Info">i</div>
            <img src="${imgUrl}" loading="lazy" onerror="this.style.opacity=0.3">
            <div class="card-num">#${i}</div>
            <div class="card-name">${name}</div>
        `;
        d.onclick = () => toggleCapture(i, d);
        d.querySelector('.info-btn').onclick = (e) => { e.stopPropagation(); openDetails(i); };
        fragment.appendChild(d);
    }
    grid.appendChild(fragment);
    updateStats();
}

function openModal(data) {
    let pokemon = data;
    if (typeof data === 'number') {
        pokemon = dataSource.find(p => p.id === data);
    }
    if(pokemon) renderModalContent(pokemon);
}

function openDetails(id) {
    const data = dataSource.find(p => p.id === id);
    if(data) renderModalContent(data);
}

function getStatValue(stats, keyName, index) {
    if (!stats) return 0;
    if (Array.isArray(stats)) {
        let val = stats[index];
        if (typeof val === 'object' && val !== null) return val.base_stat || 0;
        return val || 0;
    }
    return stats[keyName] || 0;
}

function renderModalContent(data) {
    const modal = document.getElementById('modal-overlay');
    const body = document.getElementById('modal-body');
    modal.style.display = 'flex';
    
    try {
        const id = data.id;
        const imgUrl = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
        const typeColors = (typeof TYPE_COLORS !== 'undefined') ? TYPE_COLORS : {};
        const typesHtml = (data.types || []).map(t => `<span class="type-badge" style="background:${typeColors[t]||'#555'}">${t}</span>`).join('');
        const evoText = data.evo && data.evo < 100 ? `(Evolui no lvl ${data.evo})` : "(Forma Final)";

        // Stats
        const labels = ['HP', 'ATK', 'DEF', 'SP.A', 'SP.D', 'SPD'];
        let statsHtml = "";
        let s = data.stats;
        
        const values = [getStatValue(s,'hp',0), getStatValue(s,'atk',1), getStatValue(s,'def',2), getStatValue(s,'spa',3), getStatValue(s,'spd',4), getStatValue(s,'spe',5)];
        
        // Treino
        let atk = values[1], def = values[2], spa = values[3], spd = values[4], spe = values[5];
        let isPhysical = atk >= spa;
        let isFast = spe >= 100;
        let isTank = def > 90 || spd > 90;
        let natureText = isFast ? (isPhysical ? "Jolly (+Spd -SpA)" : "Timid (+Spd -Atk)") : (isTank && spe < 60 ? (def >= spd ? (isPhysical ? "Impish (+Def -SpA)" : "Bold (+Def -Atk)") : (isPhysical ? "Careful (+SpD -SpA)" : "Calm (+SpD -Atk)")) : (isPhysical ? "Adamant (+Atk -SpA)" : "Modest (+SpA -Atk)"));
        let focusText = isFast ? `Speed + ${isPhysical?'Atk':'Sp.Atk'}` : `HP + ${isPhysical?'Atk':'Sp.Atk'}`;

        values.forEach((val, i) => {
            const w = Math.min(100, (val/255)*100);
            statsHtml += `<div class="stat-row"><span class="stat-label">${labels[i]}</span><span class="stat-val">${val}</span><div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${w}%"></div></div></div>`;
        });

        // Moves
        const evoCap = data.evo || 100;
        let naturalMoves = [], tmMoves = [];
        if(data.moves && Array.isArray(data.moves)) {
            naturalMoves = data.moves.filter(m => m.method === 'level-up' && m.level <= evoCap && m.level > 1).sort((a,b)=>a.level-b.level).slice(-6);
            tmMoves = data.moves.filter(m => m.method === 'machine').slice(0, 10);
        }
        const naturalHtml = naturalMoves.length ? naturalMoves.map(m => `<span class="move-tag natural">${m.name} <span class="level-info">Lv.${m.level}</span></span>`).join('') : '<span style="color:#777">Nenhum</span>';
        const tmHtml = tmMoves.length ? tmMoves.map(m => `<span class="move-tag tm">${m.name} <span class="level-info">TM</span></span>`).join('') : '<span style="color:#777">Nenhum</span>';

        // Build
        let build = [];
        let allMoves = [...naturalMoves, ...tmMoves]; 
        const bestMoves = ['flamethrower','fire-blast','surf','hydro-pump','thunderbolt','ice-beam','earthquake','psychic','shadow-ball','dragon-claw','crunch','sludge-bomb','leaf-blade','energy-ball','moonblast','close-combat','return','body-slam','fly','strength','slash','bite','ember','water-gun','thundershock','vinewhip','confusion','rock-slide','brick-break','dig','aerial-ace'];

        (data.types || []).forEach(t => {
            let found = allMoves.find(m => bestMoves.includes(m.name) && !build.some(b=>b.name===m.name));
            if(found) build.push({...found, type:'stab'});
        });
        if(build.length < 4) {
            let covers = allMoves.filter(m => bestMoves.includes(m.name) && !build.some(b=>b.name===m.name));
            for(let c of covers) { if(build.length >= 4) break; build.push({...c, type:'cover'}); }
        }
        if(build.length < 4) {
            let fillers = naturalMoves.slice().reverse().filter(m => !build.some(b=>b.name===m.name));
            for(let f of fillers) { if(build.length >= 4) break; build.push({...f, type:'stab'}); }
        }
        const buildHtml = build.map(m => `<div class="build-slot ${m.type}">${m.name}</div>`).join('');
        const notes = db.notes[id] || "";

        body.innerHTML = `
            <div class="modal-header">
                <img src="${imgUrl}" class="modal-img">
                <div class="modal-title">
                    <h2>${data.name}</h2>
                    <div class="modal-types">${typesHtml} <span style="font-size:0.8rem; color:#aaa; margin-left:10px;">${evoText}</span></div>
                </div>
            </div>
            <div style="margin-bottom:15px;">${statsHtml}</div>
            
            <div class="specs-box" style="margin-top:0;">
                <span class="specs-title">🏆 Build Recomendada</span>
                <div class="build-grid">${buildHtml}</div>
            </div>

            <div class="specs-box">
                <span class="specs-title">🍃 Naturais (Até Lv.${evoCap})</span>
                <div class="move-grid">${naturalHtml}</div>
                <div style="height:12px"></div>
                <span class="specs-title" style="color:var(--tm-color)">💿 TMs Disponíveis</span>
                <div class="move-grid">${tmHtml}</div>
            </div>

            <div class="specs-box">
                <span class="specs-title">⚡ Sugestão de Treino</span>
                <p style="margin:5px 0; font-size:0.9rem;"><strong>Natureza:</strong> ${natureText}</p>
                <p style="margin:5px 0; font-size:0.9rem;"><strong>Foco:</strong> ${focusText}</p>
            </div>

            <div class="specs-box">
                <span class="specs-title">📝 Notas</span>
                <textarea class="user-notes" id="notes-${id}">${notes}</textarea>
                <button class="btn" style="width:100%; margin-top:5px; background:var(--accent);" onclick="saveNote(${id})">Salvar</button>
            </div>
        `;
    } catch (err) {
        console.error(err);
        body.innerHTML = `<div style="padding:20px; text-align:center;">Erro ao carregar detalhes: ${err.message}</div>`;
    }
}

function toggleCapture(id, el) {
    if(!db.captured[currentRegId]) db.captured[currentRegId] = [];
    const list = db.captured[currentRegId];
    const idx = list.indexOf(id);
    if (idx > -1) { list.splice(idx, 1); el.classList.remove('captured'); } 
    else { list.push(id); el.classList.add('captured'); }
    save(); updateStats();
}

function updateStats() {
    if(typeof REGIONS_DB === 'undefined') return;
    const config = REGIONS_DB.find(r => r.id === currentRegId);
    if(!config) return;
    const total = config.end - config.start + 1;
    const c = db.captured[currentRegId]?.length || 0;
    const p = Math.floor((c / total) * 100);
    document.getElementById('stats').innerText = `${c} / ${total} (${p}%)`;
}

function saveNote(id) { 
    if(!db.notes) db.notes = {};
    db.notes[id] = document.getElementById(`notes-${id}`).value; 
    save(); 
    alert("Salvo!"); 
}

/* ========================
   5. CHAT IA (GEMINI)
   ======================== */

// ⚠️ SUBSTITUA PELA SUA CHAVE DE API DO GOOGLE GEMINI
const GEMINI_API_KEY = "AIzaSyDuzQZyURjBIELlNn989UIwgzy5h8shNpE"; 

function toggleChat() {
    const container = document.getElementById('chat-container');
    container.classList.toggle('hidden');
    if (!container.classList.contains('hidden')) {
        document.getElementById('user-input').focus();
    }
}

function handleEnter(e) {
    if (e.key === 'Enter') sendMessage();
}

// 1. Função de Enviar Mensagem (Simplificada)
async function sendMessage() {
    const input = document.getElementById('user-input');
    const message = input.value.trim();
    if (!message) return;

    // Mostra mensagem do usuário
    addMessage(message, 'user');
    input.value = '';
    input.disabled = true;

    // Mostra "Pensando..."
    addMessage("Pensando...", 'bot', true);
    
    try {
        // AGORA CHAMAMOS A API DIRETO, SEM BUSCAR DADOS LOCAIS ANTES
        const response = await callGeminiAPI(message);
        
        removeTempMessage();
        addMessage(response, 'bot');
    } catch (error) {
        removeTempMessage();
        addMessage("Erro ao conectar com a IA.", 'bot');
        console.error(error);
    }
    
    input.disabled = false;
    input.focus();
}

function addMessage(text, sender, isTemp = false) {
    const div = document.createElement('div');
    div.className = `message ${sender} ${isTemp ? 'temp-msg' : ''}`;
    
    // Converte quebras de linha em <br> e formata negrito básico (**texto**)
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>'); 
    formatted = formatted.replace(/\n/g, '<br>');
    
    div.innerHTML = formatted;
    
    const container = document.getElementById('chat-messages');
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

function removeTempMessage() {
    const temp = document.querySelector('.temp-msg');
    if(temp) temp.remove();
}

// Função atualizada com Prompt mais flexível
async function callGeminiAPI(userMsg, contextData) {
    // CORREÇÃO: Mudamos para 'gemini-pro' que é o modelo mais compatível
    const modelName = "gemini-2.5-flash"; 
    
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;
    
    let systemPrompt = `
    Você é o 'Professor pokémon', um especialista em Pokémons.
  Diretrizes:
    1. Responda perguntas sobre Pokémon, ataques, evoluções, fraquezas, estratégias e etc mas somente sobre Pokémon.
    2. Use todo o seu conhecimento da internet/base de dados sobre a franquia Pokémon.
    3. Seja direto, resumido e responda sempre em Português (PT-BR).
    4. Se perguntarem sobre stats, use os valores padrão dos jogos oficiais (Gen 3 a 9).
    `;

    const payload = {
        contents: [{
            parts: [{ text: `${systemPrompt}\n\nPergunta do usuário: "${userMsg}"` }]
        }]
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (!response.ok || data.error) {
            console.error("Erro API:", data);
            return `⚠️ Erro na API: ${data.error?.message || "Tente novamente."}`;
        }

        if (!data.candidates || !data.candidates[0]) {
            return "Não consegui formular uma resposta.";
        }

        return data.candidates[0].content.parts[0].text;

    } catch (error) {
        console.error("Erro de Rede:", error);
        throw error;
    }
}

function closeModal(e) { if(!e || e.target.id === 'modal-overlay' || e.target.classList.contains('close-modal')) document.getElementById('modal-overlay').style.display = 'none'; }
function exportData() { const a = document.createElement('a'); a.href = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db)); a.download = "backup.json"; a.click(); }
function importData(inp) { const f = inp.files[0]; if(!f) return; const r = new FileReader(); r.onload = e => { try { db = JSON.parse(e.target.result); save(); location.reload(); } catch(e){ alert("Erro ao importar."); } }; r.readAsText(f); }