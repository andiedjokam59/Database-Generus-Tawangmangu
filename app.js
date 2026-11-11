        const appState = {
            isLoaded: false,
            allGenerus: [],
            pjPengajarData: [],
            disabilitasGenerusList: []
        };

        const SUPABASE_URL = "https://xijlyydfogbkcctlycsb.supabase.co";
        const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhpamx5eWRmb2dia2NjdGx5Y3NiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxMzAxODYsImV4cCI6MjA5NzcwNjE4Nn0.JwqYXWEt2yiLioI1o9qZ3KRrak2rtzO1Tp0eN7AuAm4";
        const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

        let currentMode = "DAFTAR", targetIdGenerus = null, payloadData = null;

        const URUTAN_KATEGORI_STANDAR = ["BALITA", "PAUD", "TK", "Caberawit", "Pra Remaja", "Remaja", "Usia Mandiri", "Pengajar", "KD Kelompok"];

        document.addEventListener('click', function (e) {
            const btn = e.target.closest('button, a.cursor-pointer, .picker-option-item, tr.clickable-row');
            if (!btn) return;
            btn.classList.remove('animate-bounce-click');
            void btn.offsetWidth;
            btn.classList.add('animate-bounce-click');
            setTimeout(() => btn.classList.remove('animate-bounce-click'), 420);
        });

        window.addEventListener('load', async function() {
            const loader = document.getElementById('appLoadingScreen');
            try {
                await loadInitialData();
            } catch (err) {
                console.error("Gagal memuat data awal:", err);
            } finally {
                if(loader) {
                    loader.classList.add('opacity-0');
                    setTimeout(() => loader.style.display = 'none', 500);
                }
            }
        });

        async function loadInitialData() {
            let data = [], page = 0; 
            const pageSize = 1000; 
            let hasMore = true;

            while (hasMore) {
                const { data: pageData, error } = await supabaseClient
                    .from('data_generus')
                    .select('*')
                    .range(page * pageSize, (page + 1) * pageSize - 1);
                
                if (error) throw error;
                data = data.concat(pageData || []);
                if (pageData.length < pageSize) hasMore = false; else page++;
            }

            appState.allGenerus = data;
            appState.isLoaded = true;
            updatePjPengajarCache();
            updateDisabilitasGenerusCache();
        }

        function updatePjPengajarCache() {
            appState.pjPengajarData = appState.allGenerus
                .filter(item => ['KD Kelompok', 'Pengajar'].includes(item.kategori_usia))
                .sort((a, b) => {
                    if (a.kategori_usia !== b.kategori_usia) {
                        return b.kategori_usia.localeCompare(a.kategori_usia);
                    }
                    return (a.nama || '').localeCompare(b.nama || '');
                });
        }

        function updateDisabilitasGenerusCache() {
            appState.disabilitasGenerusList = appState.allGenerus.filter(item => item.is_disabilitas === true);
            const countEl = document.getElementById('rekapDisabilitasCount');
            if(countEl) countEl.textContent = `${appState.disabilitasGenerusList.length} Orang`;
        }

        const dobTanggal = document.getElementById('dob_tanggal');
        const dobBulan = document.getElementById('dob_bulan');
        const dobTahun = document.getElementById('dob_tahun');

        for (let i = 1; i <= 31; i++) dobTanggal.add(new Option(i < 10 ? '0' + i : i, i < 10 ? '0' + i : i));
        
        const namaBulan = ["Januari","Februari","Maret","April","Mei","Juni","Juli","Agustus","September","Oktober","November","Desember"];
        namaBulan.forEach((bln, idx) => {
            const val = (idx + 1 < 10 ? '0' : '') + (idx + 1);
            dobBulan.add(new Option(bln, val));
        });

        const tahunSekarang = new Date().getFullYear();
        for (let i = tahunSekarang; i >= tahunSekarang - 100; i--) dobTahun.add(new Option(i, i));

        function hitungUmurOtomatis(thn, bln, tgl) {
            if (!thn || !bln || !tgl) return null;
            const today = new Date(), birthDate = new Date(thn, parseInt(bln) - 1, tgl);
            let age = today.getFullYear() - birthDate.getFullYear();
            const monthDiff = today.getMonth() - birthDate.getMonth();
            if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) age--;
            return age >= 0 ? age : null;
        }

        function updateInfoUmurForm() {
            const umur = hitungUmurOtomatis(dobTahun.value, dobBulan.value, dobTanggal.value);
            const infoUmurEl = document.getElementById('infoUmurText');
            infoUmurEl.textContent = umur !== null ? `💡 Umur saat ini: ${umur} tahun` : '';
            infoUmurEl.classList.toggle('hidden', umur === null);
        }

        [dobTanggal, dobBulan, dobTahun].forEach(el => el.addEventListener('change', updateInfoUmurForm));

        const dataWilayah = {
            "Karanglo Selatan": ["Blimbing 1", "Blimbing 2", "Blimbing 3", "Pedan Selatan", "Pedan Utara", "Jabalkanil", "Karanglo"],
            "Karanglo Utara": ["Pandeyan", "Dukuh", "Sadakan Lor", "Sadakan Kidul 1", "Sadakan Kidul 2", "Sekuwung", "Cepogo", "Plombokan"],
            "Bandardawung": ["Dawung Atas", "Dawung Tengah", "Dawung Bawah", "Bandardawung Timur", "Bandardawung Barat", "Gondang Timur", "Gondang Tengah", "Gondang Barat", "Pelas Timur", "Pelas Barat", "Gamping", "Ngasem"],
            "Krangean": ["Gondosuli", "Tawang 1", "Tawang 2", "Watusambang", "Somokado", "Gondang Boma", "Krangean Selatan", "Krangean Utara", "Nglegok Atas", "Nglegok Bawah", "Ngreso"]
        };

        const urutanKelompokPeta = [
            "Gondosuli", "Tawang 1", "Tawang 2", "Gondang Boma", "Nglegok Atas", "Nglegok Bawah", 
            "Krangean Selatan", "Krangean Utara", "Ngreso", "Somokado", "Watusambang", "Pelas Timur", 
            "Pelas Barat", "Gamping", "Ngasem", "BD Timur", "BD Barat", "Gondang Timur", 
            "Gondang Tengah", "Gondang Barat", "Dawung Atas", "Dawung Tengah", "Dawung Bawah", 
            "Plombokan", "Cepogo", "Sekuwung", "Sadakan Kidul 1", "Sadakan Kidul 2", "Sadakan Lor", 
            "Pandeyan", "Dukuh", "Pedan Utara", "Pedan Selatan", "Karanglo", "Jabalkanil",
            "Blimbing 1", "Blimbing 2", "Blimbing 3"
        ];

        const daftarPemonitoringLengkap = [
            { nama: "Slamet Abdullah", baseKlp: "Gondosuli" },
            { nama: "Paryanto", baseKlp: "Tawang 1" },
            { nama: "Fakhrudin, S.Pd. I.", baseKlp: "Tawang 2" },
            { nama: "H. Sukimin, S.Pd.", baseKlp: "Gondang Boma" },
            { nama: "Khoirul Agung", baseKlp: "Nglegok Atas" },
            { nama: "H Pandoyo, A.Md.", baseKlp: "Nglegok Bawah" },
            { nama: "Andi Rosady", baseKlp: "Krangean Selatan" },
            { nama: "Sri Samiyati, S.Pd.", baseKlp: "Krangean Utara" },
            { nama: "Wainem, S.Pd.", baseKlp: "Ngreso" },
            { nama: "Salamun", baseKlp: "Somokado" },
            { nama: "Warsono", baseKlp: "Watusambang" },
            { nama: "Eko Prasetyo", baseKlp: "Pelas Timur" },
            { nama: "Triyono", baseKlp: "Pelas Barat" },
            { nama: "Aditya Darma, S.Pd", baseKlp: "Gamping" },
            { nama: "Bekti Sunyoto, S.Pd", baseKlp: "Ngasem" },
            { nama: "H.Riyanto", baseKlp: "BD Timur" },
            { nama: "Budi priyanto, S.Pd.I", baseKlp: "BD Barat" },
            { nama: "Candra Kurniawan", baseKlp: "Gondang Timur" },
            { nama: "Anwar", baseKlp: "Gondang Tengah" },
            { nama: "Priyanto", baseKlp: "Gondang Barat" },
            { nama: "Muh. Ichsan", baseKlp: "Dawung Atas" },
            { nama: "Anas Mustakim", baseKlp: "Dawung Tengah" },
            { nama: "H Tommy Arjanto, A.Md.", baseKlp: "Dawung Bawah" },
            { nama: "Wagiyanto", baseKlp: "Plombokan" },
            { nama: "Anik Supriyanti, S.Pd.", baseKlp: "Cepogo" },
            { nama: "Ivone Riska Budiyanti", baseKlp: "Sekuwung" },
            { nama: "H. Abdul Latief Sutarno", baseKlp: "Sadakan Kidul 1" },
            { nama: "Wahyu Hidayati Prasetyaningsih AMK", baseKlp: "Sadakan Kidul 2" },
            { nama: "Aditya Hamida, S.Kom", baseKlp: "Sadakan Lor" },
            { nama: "Made Hanif Sasongko, S. E.", baseKlp: "Pandeyan" },
            { nama: "Sufyan", baseKlp: "Dukuh" },
            { nama: "Hendri", baseKlp: "Pedan Utara" },
            { nama: "Sakri Syaifuddin", baseKlp: "Pedan Selatan" },
            { nama: "Sritanto", baseKlp: "Karanglo" },
            { nama: "Nurjiyanto", baseKlp: "Jabalkanil" },
            { nama: "Ahmad Nur Alfi", baseKlp: "Blimbing 1" },
            { nama: "Aziz purwanto", baseKlp: "Blimbing 2" },
            { nama: "Sugiyatno", baseKlp: "Blimbing 3" }
        ];

        const desaSelect = document.getElementById('desa'), kelompokSelect = document.getElementById('kelompok');
        const submitBtn = document.getElementById('submitBtn'), confirmSaveBtn = document.getElementById('confirmSaveBtn');
        const customModal = document.getElementById('customModal'), modalReview = document.getElementById('modalReview'), modalSuccess = document.getElementById('modalSuccess'), modalError = document.getElementById('modalError'), modalContact = document.getElementById('modalContact'), modalPjPengajarList = document.getElementById('modalPjPengajarList');
        const errorMessage = document.getElementById('errorMessage'), optMenikah = document.getElementById('optMenikah');
        const rekapSection = document.getElementById('rekapSection'), rekapLoader = document.getElementById('rekapLoader'), rekapContent = document.getElementById('rekapContent');
        const tableUsiaBody = document.getElementById('tableUsiaBody'), tableUsiaFoot = document.getElementById('tableUsiaFoot'), tableKelasBody = document.getElementById('tableKelasBody'), tableKelasFoot = document.getElementById('tableKelasFoot'), rekapTotalData = document.getElementById('rekapTotalData');
        const kategoriSelect = document.getElementById('kategori_usia'), formTambahanKhusus = document.getElementById('formTambahanKhusus'), nomorHpInput = document.getElementById('nomor_hp'), wrapperKelasFormal = document.getElementById('wrapperKelasFormal'), containerKelasFormal = document.getElementById('containerKelasFormal');

        let activeMenuState = 'home';

        window.addEventListener('DOMContentLoaded', () => history.replaceState({ menu: 'home' }, '', '#home'));

        window.addEventListener('popstate', (e) => {
            const centerPicker = document.getElementById('centerPickerModal');
            if (centerPicker && !centerPicker.classList.contains('hidden')) return closeCenterPicker(false);

            const csvModal = document.getElementById('modalExportCsv');
            if (csvModal && !csvModal.classList.contains('hidden')) return closeCsvModal(false);

            const disModal = document.getElementById('disabilitasDetailModal');
            if (disModal && !disModal.classList.contains('hidden')) return closeDisabilitasModalGenerus(false);

            if (customModal && !customModal.classList.contains('hidden')) return closeModalOnly(false);

            switchMenuView(e.state && e.state.menu ? e.state.menu : 'home');
        });

        function showElementSmooth(el) {
            el.classList.remove('fade-hidden');
            void el.offsetWidth; 
            el.classList.add('fade-visible');
        }

        function hideElementSmooth(el, callback) {
            el.classList.remove('fade-visible');
            setTimeout(() => {
                el.classList.add('fade-hidden');
                if (callback) callback();
            }, 300);
        }

        function showMainDashboard(pushHistory = true) {
            if (pushHistory) history.pushState({ menu: 'home' }, '', '#home');
            switchMenuView('home');
        }

        function openMenu(menuType, pushHistory = true) {
            if (pushHistory) history.pushState({ menu: menuType }, '', '#' + menuType);
            switchMenuView(menuType);
        }

        function showComingSoonNotice() {
            triggerPopupModal("Fitur Segera Hadir!", "Jadwal Monitoring Musyawarah 5 Unsur menunggu hasil musyawarah dulu. Alkahmdulillah Jaza Kumullahu Khoiro", "warning");
        }

        function switchMenuView(menuType) {
            activeMenuState = menuType;
            if (menuType === 'home') {
                hideElementSmooth(document.getElementById('backToHomeBtn'));
                hideElementSmooth(document.getElementById('formGenerus'));
                hideElementSmooth(document.getElementById('searchSection'));
                hideElementSmooth(document.getElementById('rekapSection'));
                hideElementSmooth(document.getElementById('monitoringSection'));
                setTimeout(() => {
                    showElementSmooth(document.getElementById('mainDashboard'));
                    document.getElementById('mainTitle').textContent = "PENDATAAN GENERUS";
                    document.getElementById('mainSubtitle').textContent = "Pilih menu di bawah untuk melanjutkan";
                }, 250);
            } else {
                hideElementSmooth(document.getElementById('mainDashboard'), () => {
                    showElementSmooth(document.getElementById('backToHomeBtn'));
                    if (menuType === 'DATABASE') switchMode('DAFTAR');
                    else if (menuType === 'UPDATE') { switchMode('UPDATE'); initFilterDaftarNama(); }
                    else if (menuType === 'REKAP') { switchMode('REKAP'); fetchAndBuildRekap(); }
                    else if (menuType === 'MONITORING') { switchMode('MONITORING'); initMonitoringSection(); }
                });
            }
        }

        document.addEventListener('input', function(e) {
            if (e.target && e.target.tagName === 'INPUT' && e.target.type === 'text') {
                let cursorPosition = e.target.selectionStart, originalValue = e.target.value;
                let formattedValue = toTitleCase(originalValue);
                if (originalValue !== formattedValue) {
                    e.target.value = formattedValue;
                    e.target.setSelectionRange(cursorPosition, cursorPosition);
                }
            }
        });

        function formatKelasFormal(val) {
            if (!val) return "";
            let formatted = toTitleCase(val.trim());
            if (formatted.toUpperCase() === "PENGANGGURAN") return "BELUM KERJA";

            return formatted.replace(/\bBalita\b/gi, 'BALITA')
							.replace(/\bPaud\b/gi, 'PAUD')
                            .replace(/\bTk\b/gi, 'TK')
                            .replace(/\bSd\b/gi, 'SD')
                            .replace(/\bSmp\b/gi, 'SMP')
                            .replace(/\bSma\b/gi, 'SMA')
                            .replace(/\bSmk\b/gi, 'SMK')
                            .replace(/SMA\/SMK\/Smk/gi, 'SMA/SMK')
                            .replace(/SMA\/SMK\/SMK/gi, 'SMA/SMK');
        }

        function toTitleCase(str) { return str.toLowerCase().replace(/\b\w/g, s => s.toUpperCase()); }

        kategoriSelect.addEventListener('change', function() {
            const kat = this.value;
            if (!kat) {
                wrapperKelasFormal.classList.add('hidden');
                formTambahanKhusus.classList.add('hidden');
                nomorHpInput.required = false; nomorHpInput.value = ""; resetMengajarCheckboxes();
                return;
            }

            if (kat === "Pengajar" || kat === "KD Kelompok") {
                formTambahanKhusus.classList.remove('hidden');
                formTambahanKhusus.classList.add('animate-field-in');
                nomorHpInput.required = true;
                wrapperKelasFormal.classList.add('hidden');
                containerKelasFormal.innerHTML = `<input type="text" id="kelas_formal" value="" class="glass-input block w-full rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm text-slate-900 font-medium">`;
            } else if (kat === "BALITA" || kat === "PAUD" || kat === "Menikah/Boarding/Sambung Luar Daerah") {
				formTambahanKhusus.classList.add('hidden');
				nomorHpInput.required = false; nomorHpInput.value = ""; resetMengajarCheckboxes();
				wrapperKelasFormal.classList.add('hidden');
				let defaultKelasVal = kat === 'BALITA' ? 'BALITA' : (kat === 'PAUD' ? 'PAUD' : '');
				containerKelasFormal.innerHTML = `<input type="text" id="kelas_formal" value="${defaultKelasVal}" class="glass-input block w-full rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm text-slate-900 font-medium">`;
			} else {
                formTambahanKhusus.classList.add('hidden');
                nomorHpInput.required = false; nomorHpInput.value = ""; resetMengajarCheckboxes();
                wrapperKelasFormal.classList.remove('hidden');
                wrapperKelasFormal.classList.add('animate-field-in');
                
                let selectOptions = `<option value="">-- Pilih Kelas/Status --</option>`;
                if (kat === "TK") selectOptions += `<option value="TK A">TK A</option><option value="TK B">TK B</option>`;
                else if (kat === "Caberawit") { for(let i=1; i<=6; i++) selectOptions += `<option value="${i} SD">${i} SD</option>`; }
                else if (kat === "Pra Remaja") { for(let i=1; i<=3; i++) selectOptions += `<option value="${i} SMP">${i} SMP</option>`; }
                else if (kat === "Remaja") { for(let i=1; i<=3; i++) selectOptions += `<option value="${i} SMA/SMK">${i} SMA/SMK</option>`; }
                else if (kat === "Usia Mandiri") selectOptions += `<option value="KULIAH">KULIAH</option><option value="KERJA">KERJA</option><option value="BELUM KERJA">BELUM KERJA</option>`;
                else {
                    containerKelasFormal.innerHTML = `<input type="text" id="kelas_formal" required placeholder="Contoh: 3 SD, 1 SMA/SMK, Kuliah Sem 4, Kerja" class="glass-input block w-full rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm text-slate-900 font-medium">`;
                    return;
                }

                containerKelasFormal.innerHTML = `<select id="kelas_formal" required class="glass-input smooth-select block w-full rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm text-slate-900 font-medium cursor-pointer">${selectOptions}</select>`;
            }
        });

        /* DISABILITAS HELPER LOGIC (CHECKBOX PAKAI SUB-TEXT) */
        function toggleDisabilitasOptionsForm() {
            const isDis = document.getElementById('is_disabilitas').checked;
            const wrap = document.getElementById('wrapperKategoriDisabilitas');
            if (isDis) {
                wrap.classList.remove('hidden');
                wrap.classList.add('animate-field-in');
            } else {
                wrap.classList.add('hidden');
                resetDisabilitasCheckboxes();
            }
        }

        function resetDisabilitasCheckboxes() {
            document.querySelectorAll('input[name="kategori_disabilitas"]').forEach(cb => cb.checked = false);
        }

        function getSelectedKategoriDisabilitasForm() {
            return Array.from(document.querySelectorAll('input[name="kategori_disabilitas"]:checked')).map(cb => cb.value);
        }

        function resetMengajarCheckboxes() {
            document.querySelectorAll('input[name="mengajar_usia"]').forEach(cb => cb.checked = false);
        }

        function getSelectedMengajarUsia() {
            return Array.from(document.querySelectorAll('input[name="mengajar_usia"]:checked')).map(cb => cb.value);
        }

        desaSelect.addEventListener('change', function() { updateKelompokDropdown(this.value, "", kelompokSelect); });

        function triggerPopupModal(title, msg, type = 'error') {
            const errorTitle = document.getElementById('errorTitle'), errorIconContainer = document.getElementById('errorIconContainer');
            const errorSubHelp = document.getElementById('errorSubHelp');
            
            errorTitle.textContent = title; errorMessage.textContent = msg;
            
            if(type === 'warning') {
                errorSubHelp.className = "text-[11px] sm:text-xs text-amber-800 font-bold mb-3 bg-amber-50 p-3 rounded-xl border border-amber-100";
                errorSubHelp.textContent = "💡 Fitur Ini Dalam Pengembangan";
                errorIconContainer.className = "mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-amber-100 text-amber-600 mb-4 shadow-inner";
                errorIconContainer.innerHTML = `<svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>`;
            } else {
                errorSubHelp.className = "text-[11px] sm:text-xs text-rose-700 font-bold mb-3 bg-rose-50 p-3 rounded-xl border border-rose-100";
                errorSubHelp.textContent = "💡 Pengertian: Nama generus ini terdeteksi sudah terdaftar sebelumnya atau terjadi duplikasi data di database kelompok Anda.";
                errorIconContainer.className = "mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-rose-100 text-rose-600 mb-4 shadow-inner";
                errorIconContainer.innerHTML = `<svg class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>`;
            }

            modalReview.classList.add('hidden'); modalSuccess.classList.add('hidden'); modalContact.classList.add('hidden'); modalPjPengajarList.classList.add('hidden'); document.getElementById('modalDetailRekap').classList.add('hidden');
            modalError.classList.remove('hidden');
            openModalAnimation('customModal');
        }

        function showContactModal(nama, peran, desa, kelompok, noHp) {
            document.getElementById('contactName').textContent = nama;
            document.getElementById('contactRole').textContent = peran;
            document.getElementById('contactWilayah').textContent = `${desa} - ${kelompok}`;
            document.getElementById('contactPhone').textContent = noHp || "Belum mendaftarkan nomor";

            const btnWa = document.getElementById('btnWaDirect');
            if (noHp) {
                let cleanPhone = noHp.replace(/[^0-9]/g, '');
                if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);
                const msgText = encodeURIComponent(`Assalamu'alaikum Wr. Wb. Halo ${peran} ${nama}, saya menghubungi dari SIM Data Generus.`);
                btnWa.href = `https://wa.me/${cleanPhone}?text=${msgText}`;
                btnWa.classList.remove('opacity-50', 'pointer-events-none');
            } else {
                btnWa.href = "#"; btnWa.classList.add('opacity-50', 'pointer-events-none');
            }

            modalReview.classList.add('hidden'); modalSuccess.classList.add('hidden'); modalError.classList.add('hidden'); modalPjPengajarList.classList.add('hidden'); document.getElementById('modalDetailRekap').classList.add('hidden');
            modalContact.classList.remove('hidden');
            openModalAnimation('customModal');
        }

        async function openPjPengajarModal() {
            document.getElementById('searchPjPengajarInput').value = "";

            modalReview.classList.add('hidden'); modalSuccess.classList.add('hidden'); modalError.classList.add('hidden'); modalContact.classList.add('hidden'); document.getElementById('modalDetailRekap').classList.add('hidden');
            modalPjPengajarList.classList.remove('hidden');
            openModalAnimation('customModal');

            renderPjPengajarList(appState.pjPengajarData);
        }

        function renderPjPengajarList(items) {
            const container = document.getElementById('pjPengajarContainer');
            if (!items || items.length === 0) {
                container.innerHTML = `<p class="text-center text-xs text-slate-400 py-6 font-medium italic">Tidak ada data KD atau Pengajar ditemukan.</p>`;
                return;
            }

            container.innerHTML = "";
            items.forEach(item => {
                const itemDiv = document.createElement('div');
                itemDiv.className = "p-3 bg-white hover:bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between gap-3 transition-colors shadow-sm";

                const badgeColor = item.kategori_usia === 'KD Kelompok' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-orange-100 text-orange-700 border-orange-200';
                let cleanPhone = (item.nomor_hp || '').replace(/[^0-9]/g, '');
                if (cleanPhone.startsWith('0')) cleanPhone = '62' + cleanPhone.slice(1);

                const msgText = encodeURIComponent(`Assalamu'alaikum Wr. Wb. Halo ${item.kategori_usia} ${item.nama}, saya menghubungi dari SIM Data Generus.`);
                const waUrl = cleanPhone ? `https://wa.me/${cleanPhone}?text=${msgText}` : '#';

                let extraInfo = '';
                if (item.mengajar_usia && Array.isArray(item.mengajar_usia) && item.mengajar_usia.length > 0) {
                    extraInfo = `<p class="text-[10px] text-slate-400 font-semibold mt-1">Mengajar: ${item.mengajar_usia.join(', ')}</p>`;
                } else if (typeof item.mengajar_usia === 'string' && item.mengajar_usia.trim() !== '') {
                    extraInfo = `<p class="text-[10px] text-slate-400 font-semibold mt-1">Mengajar: ${item.mengajar_usia}</p>`;
                }

                itemDiv.innerHTML = `
                    <div class="space-y-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-extrabold text-xs text-slate-800">${item.nama}</span>
                            <span class="text-[9px] font-bold px-1.5 py-0.5 rounded border ${badgeColor}">${item.kategori_usia}</span>
                        </div>
                        <p class="text-[10px] sm:text-[11px] text-slate-500 font-bold">📍 ${item.desa} - ${item.kelompok}</p>
                        ${extraInfo}
                    </div>
                    <div class="shrink-0">
                        ${cleanPhone ? `<a href="${waUrl}" target="_blank" class="inline-flex items-center justify-center p-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-xl transition-all border border-emerald-200 shadow-sm" title="Hubungi WA"><svg class="w-4 h-4 fill-current"><use href="#icon-wa"/></svg></a>` : `<span class="text-[9px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">No HP (-)</span>`}
                    </div>
                `;
                container.appendChild(itemDiv);
            });
        }

        function filterPjPengajarList() {
            const query = document.getElementById('searchPjPengajarInput').value.toLowerCase();
            const filtered = appState.pjPengajarData.filter(item => {
                return (item.nama || '').toLowerCase().includes(query) || 
                       (item.kategori_usia || '').toLowerCase().includes(query) || 
                       (item.desa || '').toLowerCase().includes(query) || 
                       (item.kelompok || '').toLowerCase().includes(query) || 
                       (item.nomor_hp || '').toLowerCase().includes(query);
            });
            renderPjPengajarList(filtered);
        }

        function openModalAnimation(modalId = 'customModal', pushHistory = true) {
            const modal = document.getElementById(modalId);
            if (!modal) return;
            if (pushHistory) history.pushState({ modal: modalId, menu: activeMenuState }, '', '#' + modalId);
            const modalBox = modal.querySelector('div');
            modal.classList.remove('hidden');
            void modal.offsetWidth;
            modal.classList.remove('opacity-0');
            if (modalBox) {
                modalBox.classList.remove('scale-95', 'scale-90', 'opacity-0');
                modalBox.classList.add('scale-100', 'opacity-100');
            }
        }

        function closeModalAnimation(modalId = 'customModal', backHistory = true, callback = null) {
            const modal = document.getElementById(modalId);
            if (!modal || modal.classList.contains('hidden')) return;

            const modalBox = modal.querySelector('div');
            modal.classList.add('opacity-0');
            if (modalBox) {
                modalBox.classList.remove('scale-100', 'opacity-100');
                modalBox.classList.add('scale-95', 'opacity-0');
            }

            setTimeout(() => {
                modal.classList.add('hidden');
                if (callback) callback();
            }, 200);

            if (backHistory && window.history.state && window.history.state.modal === modalId) {
                window.history.back();
            }
        }

        function updateKelompokDropdown(desaTerpilih, kelompokTerpilih, targetSelect, placeholderText = "-- Pilih Kelompok --") {
            targetSelect.innerHTML = `<option value="">${placeholderText}</option>`;
            if(desaTerpilih && dataWilayah[desaTerpilih]) {
                targetSelect.disabled = false;
                targetSelect.classList.remove('bg-slate-100/50', 'opacity-60');
                targetSelect.classList.add('bg-white', 'opacity-100');
                dataWilayah[desaTerpilih].forEach(k => {
                    const opt = new Option(k, k);
                    if(k === kelompokTerpilih) opt.selected = true;
                    targetSelect.add(opt);
                });
            } else {
                targetSelect.disabled = true;
                targetSelect.classList.add('bg-slate-100/50', 'opacity-60');
                targetSelect.classList.remove('bg-white', 'opacity-100');
            }
        }

        function switchMode(selectedMode) {
            currentMode = selectedMode;
            const searchSection = document.getElementById('searchSection'), formGenerus = document.getElementById('formGenerus'), monitoringSection = document.getElementById('monitoringSection');
            const formTitleHeader = document.getElementById('formTitleHeader'), mainTitle = document.getElementById('mainTitle'), mainSubtitle = document.getElementById('mainSubtitle');

            formGenerus.reset(); updateInfoUmurForm(); formTambahanKhusus.classList.add('hidden');
            wrapperKelasFormal.classList.add('hidden');
            containerKelasFormal.innerHTML = `<input type="text" id="kelas_formal" value="" class="glass-input block w-full rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm text-slate-900 font-medium">`;
            
            nomorHpInput.required = false; updateKelompokDropdown("", "", kelompokSelect); targetIdGenerus = null;
            document.getElementById('is_disabilitas').checked = false;
            toggleDisabilitasOptionsForm();

            if (currentMode === "UPDATE") {
                mainTitle.textContent = "UPDATE DATA GENERUS"; mainSubtitle.textContent = "Pilih kelompok dan klik nama generus yang ingin diperbarui";
                showElementSmooth(searchSection); hideElementSmooth(formGenerus); hideElementSmooth(rekapSection); hideElementSmooth(monitoringSection);
                formTitleHeader.classList.remove('hidden'); submitBtn.textContent = "Perbarui Data"; optMenikah.classList.remove('hidden');
            } else if (currentMode === "REKAP") {
                mainTitle.textContent = "REKAP DATA GENERUS"; mainSubtitle.textContent = "Statistik serta ringkasan akumulasi seluruh data";
                hideElementSmooth(searchSection); hideElementSmooth(formGenerus); showElementSmooth(rekapSection); hideElementSmooth(monitoringSection);
            } else if (currentMode === "MONITORING") {
                mainTitle.textContent = "JADWAL MONITORING"; mainSubtitle.textContent = "Jadwal pemonitoring per kelompok dengan continuous rolling";
                hideElementSmooth(searchSection); hideElementSmooth(formGenerus); hideElementSmooth(rekapSection); showElementSmooth(monitoringSection);
            } else {
                mainTitle.textContent = "PENDATAAN GENERUS"; mainSubtitle.textContent = "Silakan lengkapi data generus anda dengan benar";
                hideElementSmooth(searchSection); hideElementSmooth(rekapSection); hideElementSmooth(monitoringSection); showElementSmooth(formGenerus);
                formTitleHeader.classList.add('hidden'); submitBtn.textContent = "Kirim Data"; optMenikah.classList.add('hidden');
            }
        }

        const TAHUN_PATOKAN = 2026;

        function initMonitoringSection() {
            const today = new Date();
            const currentMonth = today.getMonth();

            const selBulan = document.getElementById('monSelectBulan');
            if (selBulan) {
                selBulan.value = currentMonth;
                selBulan.onchange = function() {
                    renderJadwalMonitoringBulan(parseInt(this.value));
                };
            }

            renderJadwalMonitoringBulan(currentMonth);
        }

        function renderJadwalMonitoringBulan(bulanIdx) {
            const tbody = document.getElementById('monJadwalBody');
            const labelTriwulan = document.getElementById('monLabelTriwulan');
            if (!tbody) return;

            const tahunSelected = new Date().getFullYear();
            const triwulanTahunIni = Math.floor(bulanIdx / 3);
            const selisihTahun = tahunSelected - TAHUN_PATOKAN;
            
            const totalTriwulanBerlalu = (selisihTahun * 4) + triwulanTahunIni;
            const totalTriwulanSelanjutnya = totalTriwulanBerlalu + 1;

            labelTriwulan.textContent = `${namaBulan[bulanIdx]} ${tahunSelected} (Triwulan ${(triwulanTahunIni + 1)})`;
            tbody.innerHTML = "";

            const totalKelompok = urutanKelompokPeta.length;

            daftarPemonitoringLengkap.forEach((pem, idx) => {
                const baseKlpIdx = urutanKelompokPeta.indexOf(pem.baseKlp);
                let targetKlpNama = "-";
                let nextKlpNama = "-";

                if (baseKlpIdx !== -1) {
                    let currentKlpIdx = (baseKlpIdx + totalTriwulanBerlalu) % totalKelompok;
                    let nextKlpIdx = (baseKlpIdx + totalTriwulanSelanjutnya) % totalKelompok;

                    if (currentKlpIdx < 0) currentKlpIdx = (currentKlpIdx % totalKelompok + totalKelompok) % totalKelompok;
                    if (nextKlpIdx < 0) nextKlpIdx = (nextKlpIdx % totalKelompok + totalKelompok) % totalKelompok;

                    targetKlpNama = urutanKelompokPeta[currentKlpIdx];
                    nextKlpNama = urutanKelompokPeta[nextKlpIdx];
                }

                const tr = document.createElement('tr');
                tr.className = "hover:bg-white/80 transition-colors duration-150 text-xs";
                tr.innerHTML = `
                    <td class="p-3 text-center font-bold text-slate-400">${idx + 1}</td>
                    <td class="p-3 font-extrabold text-slate-800">${pem.nama}</td>
                    <td class="p-3 font-bold text-amber-700 bg-amber-50/50 rounded-lg">${targetKlpNama}</td>
                    <td class="p-3 font-semibold text-slate-500">${nextKlpNama}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function fillFormForUpdate(match) {
            targetIdGenerus = match.id;
            const formGenerus = document.getElementById('formGenerus');
            const labelEdit = document.getElementById('namaGenerusEditLabel');

            if(labelEdit) labelEdit.textContent = match.nama;

            document.getElementById('nama').value = match.nama;
            document.getElementById('jenis_kelamin').value = match.jenis_kelamin;
            document.getElementById('tempat_lahir').value = match.tempat_lahir;
            
            if (match.tanggal_lahir) {
                const parts = match.tanggal_lahir.split('-');
                if(parts.length === 3) {
                    document.getElementById('dob_tahun').value = parts[0];
                    document.getElementById('dob_bulan').value = parts[1];
                    document.getElementById('dob_tanggal').value = parts[2];
                }
            }
            updateInfoUmurForm();

            document.getElementById('desa').value = match.desa;
            updateKelompokDropdown(match.desa, match.kelompok, kelompokSelect);
            document.getElementById('kategori_usia').value = match.kategori_usia;
            document.getElementById('kategori_usia').dispatchEvent(new Event('change'));
            
            if (match.kategori_usia === "Pengajar" || match.kategori_usia === "KD Kelompok") {
                formTambahanKhusus.classList.remove('hidden');
                nomorHpInput.required = true; nomorHpInput.value = match.nomor_hp || "";
                wrapperKelasFormal.classList.add('hidden'); resetMengajarCheckboxes();
                if (match.mengajar_usia) {
                    let muArray = Array.isArray(match.mengajar_usia) ? match.mengajar_usia : match.mengajar_usia.split(',');
                    muArray.forEach(val => {
                        const cb = document.querySelector(`input[name="mengajar_usia"][value="${val.trim()}"]`);
                        if (cb) cb.checked = true;
                    });
                }
            } else if (match.kategori_usia === "PAUD" || match.kategori_usia === "Menikah/Boarding/Sambung Luar Daerah") {
                wrapperKelasFormal.classList.add('hidden');
            } else {
                wrapperKelasFormal.classList.remove('hidden');
                const elKelas = document.getElementById('kelas_formal');
                if(elKelas) {
                    let valKelas = match.kelas_formal ? match.kelas_formal.trim().toUpperCase() : "";
                    if (valKelas === "PENGANGGURAN") valKelas = "BELUM KERJA";
                    elKelas.value = valKelas;
                }
            }

            document.getElementById('is_disabilitas').checked = match.is_disabilitas ? true : false;
            toggleDisabilitasOptionsForm();
            resetDisabilitasCheckboxes();
            if(match.is_disabilitas && match.kategori_disabilitas) {
                let katList = Array.isArray(match.kategori_disabilitas) ? match.kategori_disabilitas : match.kategori_disabilitas.split(',');
                katList.forEach(k => {
                    const cb = document.querySelector(`input[name="kategori_disabilitas"][value="${k.trim()}"]`);
                    if(cb) cb.checked = true;
                });
            }

            showElementSmooth(formGenerus);
            setTimeout(() => formGenerus.scrollIntoView({ behavior: 'smooth', block: 'start' }), 250);
        }

        document.getElementById('formGenerus').addEventListener('submit', function(e) {
            e.preventDefault();
            const nama = toTitleCase(document.getElementById('nama').value.trim());
            const jk = document.getElementById('jenis_kelamin').value;
            const tempat = toTitleCase(document.getElementById('tempat_lahir').value.trim());
            const tgl = document.getElementById('dob_tanggal').value;
            const bln = document.getElementById('dob_bulan').value;
            const thn = document.getElementById('dob_tahun').value;
            const desa = document.getElementById('desa').value;
            const kelompok = document.getElementById('kelompok').value;
            const kategori = document.getElementById('kategori_usia').value;
            const kelas = formatKelasFormal(document.getElementById('kelas_formal').value.trim());

            const isDis = document.getElementById('is_disabilitas').checked;
            const katDis = isDis ? getSelectedKategoriDisabilitasForm() : [];

            payloadData = { 
                nama, jenis_kelamin: jk, tempat_lahir: tempat, tanggal_lahir: `${thn}-${bln}-${tgl}`, 
                desa, kelompok, kategori_usia: kategori, 
                kelas_formal: (["Pengajar", "KD Kelompok", "Menikah/Boarding/Sambung Luar Daerah"].includes(kategori)) ? null : kelas,
                nomor_hp: (kategori === "Pengajar" || kategori === "KD Kelompok") ? nomorHpInput.value.trim() : null,
                mengajar_usia: (kategori === "Pengajar" || kategori === "KD Kelompok") ? getSelectedMengajarUsia() : null,
                is_disabilitas: isDis,
                kategori_disabilitas: katDis
            };

            const revTitle = document.getElementById('reviewTitle'), revSubtitle = document.getElementById('reviewSubtitle'), confirmBtn = document.getElementById('confirmSaveBtn');

            if (currentMode === "UPDATE" && kategori === "Menikah/Boarding/Sambung Luar Daerah") {
                revTitle.textContent = "⚠️ Konfirmasi Hapus Generus";
                revTitle.className = "text-lg sm:text-xl font-extrabold text-rose-700";
                revSubtitle.textContent = `Anda memilih status "Menikah/Boarding/Sambung Luar Daerah". Menekan tombol di bawah akan menghapus generus ini secara permanen dari database aktif.`;
                confirmBtn.className = "py-3 px-4 bg-rose-600 text-white text-xs sm:text-sm font-extrabold rounded-xl hover:bg-rose-700 shadow-lg shadow-rose-600/30 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2";
                confirmBtn.innerHTML = "💥 Ya, Hapus Data";
            } else {
                revTitle.textContent = "🔍 Cek Ulang Data Anda";
                revTitle.className = "text-lg sm:text-xl font-extrabold text-slate-800";
                revSubtitle.textContent = "Pastikan semua data di bawah ini sudah benar sebelum disimpan.";
                confirmBtn.className = "py-3 px-4 bg-slate-900 text-white text-xs sm:text-sm font-extrabold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all duration-200 cursor-pointer flex items-center justify-center gap-2";
                confirmBtn.innerHTML = "✅ Sudah Benar";
            }

            const umur = hitungUmurOtomatis(thn, bln, tgl);
            document.getElementById('revNama').textContent = nama;
            document.getElementById('revJK').textContent = jk === "L" ? "Laki-laki" : "Perempuan";
            document.getElementById('revTTL').textContent = `${tempat}, ${tgl}-${bln}-${thn}${umur !== null ? ` (${umur} thn)` : ''}`;
            document.getElementById('revDesa').textContent = desa;
            document.getElementById('revKelompok').textContent = kelompok;
            document.getElementById('revUsia').textContent = kategori;

            const revKhususContainer = document.getElementById('revKhususContainer'), revKelasContainer = document.getElementById('revKelasContainer');

            if (kategori === "Pengajar" || kategori === "KD Kelompok") {
                revKhususContainer.classList.remove('hidden'); revKelasContainer.classList.add('hidden');
                document.getElementById('revNoHP').textContent = payloadData.nomor_hp || "-";
                document.getElementById('revMengajar').textContent = (payloadData.mengajar_usia && payloadData.mengajar_usia.length > 0) ? payloadData.mengajar_usia.join(', ') : "Tidak memilih";
            } else if (kategori === "BALITA" || kategori === "PAUD" || kategori === "Menikah/Boarding/Sambung Luar Daerah") {
				revKhususContainer.classList.add('hidden'); revKelasContainer.classList.add('hidden');
            } else {
                revKhususContainer.classList.add('hidden'); revKelasContainer.classList.remove('hidden');
                document.getElementById('revKelas').textContent = kelas || "-";
            }

            document.getElementById('revDisabilitas').textContent = isDis ? `Ya (${katDis.length > 0 ? katDis.join(' | ') : 'Tanpa Kategori'})` : 'Tidak';

            modalReview.classList.remove('hidden'); modalSuccess.classList.add('hidden'); modalError.classList.add('hidden'); modalContact.classList.add('hidden'); modalPjPengajarList.classList.add('hidden'); document.getElementById('modalDetailRekap').classList.add('hidden');
            openModalAnimation('customModal');
        });

        async function executeSaveToSupabase() {
            if(!payloadData) return;
            const btn = document.getElementById('confirmSaveBtn');
            btn.disabled = true;
            const originalText = btn.innerHTML;

            try {
                let resultError = null;
                const isMenikah = (payloadData.kategori_usia === "Menikah/Boarding/Sambung Luar Daerah");

                if (currentMode === "UPDATE" && targetIdGenerus && isMenikah) {
                    btn.innerHTML = "Menghapus...";
                    const { error } = await supabaseClient.from('data_generus').delete().eq('id', targetIdGenerus);
                    resultError = error;
                    if (!resultError) {
                        appState.allGenerus = appState.allGenerus.filter(i => i.id !== targetIdGenerus);
                        document.getElementById('successTitle').textContent = "Berhasil Dihapus";
                        document.getElementById('successMessage').textContent = `Data generus atas nama ${payloadData.nama} telah resmi dihapus dari database aktif.`;
                        document.getElementById('successIcon').className = "mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-slate-100 text-slate-500 mb-5 shadow-inner";
                    }
                } else {
                    btn.innerHTML = "Menyimpan...";
                    if (currentMode === "UPDATE" && targetIdGenerus) {
                        const { data, error } = await supabaseClient.from('data_generus').update(payloadData).eq('id', targetIdGenerus).select();
                        resultError = error;
                        if (!resultError && data && data.length > 0) {
                            const idx = appState.allGenerus.findIndex(i => i.id === targetIdGenerus);
                            if (idx !== -1) appState.allGenerus[idx] = data[0];
                        }
                    } else {
                        const { data, error } = await supabaseClient.from('data_generus').insert([payloadData]).select();
                        resultError = error;
                        if (!resultError && data && data.length > 0) {
                            appState.allGenerus.push(data[0]);
                        }
                    }
                    if (!resultError) {
                        document.getElementById('successTitle').textContent = "Terima Kasih";
                        document.getElementById('successMessage').textContent = "Data sudah disimpan";
                        document.getElementById('successIcon').className = "mx-auto flex items-center justify-center h-20 w-20 rounded-full bg-emerald-100 text-emerald-500 mb-5 shadow-inner";
                    }
                }

                if (resultError) throw resultError;
                
                updatePjPengajarCache();
                updateDisabilitasGenerusCache();

                modalReview.classList.add('hidden'); modalSuccess.classList.remove('hidden');

            } catch (err) {
                modalReview.classList.add('hidden');
                if (err.message && err.message.toLowerCase().includes('duplicate')) {
                    document.getElementById('errorMessage').classList.add('hidden');
                    triggerPopupModal("Data Sudah Ada", "Nama generus ini sudah terdaftar.", "error");
                } else {
                    document.getElementById('errorMessage').classList.remove('hidden');
                    document.getElementById('errorMessage').textContent = err.message;
                    triggerPopupModal("Gagal Menyimpan", "Gagal menghubungi server basis data. Silakan coba sesaat lagi.", "error");
                }
            } finally {
                btn.disabled = false; btn.innerHTML = originalText;
            }
        }

        function initFilterDaftarNama() {
            const dsaSelect = document.getElementById('listFilterDesa');
            if(!dsaSelect) return;
            dsaSelect.innerHTML = '<option value="">-- Pilih Desa --</option>';
            Object.keys(dataWilayah).forEach(desa => dsaSelect.add(new Option(desa, desa)));
        }

        function updateFilterKelompokDaftar() {
            updateKelompokDropdown(document.getElementById('listFilterDesa').value, "", document.getElementById('listFilterKelompok'), "-- Pilih Kelompok --");
            document.getElementById('tableGenerusBody').innerHTML = `<tr><td colspan="5" class="p-6 text-center text-slate-500 italic font-medium text-xs">Belum ada kelompok yang dipilih.</td></tr>`;
            document.getElementById('labelTotalGenerus').textContent = "Pilih kelompok untuk lihat data";
            document.getElementById('searchNamaInList').classList.add('hidden');
        }

        function loadNamaGenerusKelompok() {
            const desa = document.getElementById('listFilterDesa').value;
            const kelompok = document.getElementById('listFilterKelompok').value;
            const tbody = document.getElementById('tableGenerusBody'), labelTotal = document.getElementById('labelTotalGenerus'), searchInput = document.getElementById('searchNamaInList');

            if (!desa || !kelompok) return;

            const data = appState.allGenerus
                .filter(item => item.desa === desa && item.kelompok === kelompok)
                .sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

            labelTotal.textContent = `Total: ${data.length} Generus (${kelompok})`;
            searchInput.classList.remove('hidden'); searchInput.value = "";

            if (data.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5" class="p-6 text-center text-rose-500 font-bold text-xs">Belum ada Generus yang terdaftar di kelompok ini.</td></tr>`;
                return;
            }

            tbody.innerHTML = "";
            data.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-white/80 transition-colors duration-150 row-Generus backdrop-blur-sm text-xs";
                
                const safeItem = JSON.stringify(item).replace(/'/g, "&apos;").replace(/"/g, "&quot;");
                let umurText = '';
                if (item.tanggal_lahir) {
                    const parts = item.tanggal_lahir.split('-');
                    if (parts.length === 3) {
                        const u = hitungUmurOtomatis(parts[0], parts[1], parts[2]);
                        if (u !== null) umurText = `<span class="text-[10px] text-slate-400 font-bold block mt-0.5">${u} thn</span>`;
                    }
                }

                let waButtonHtml = '';
                if ((item.kategori_usia === 'KD Kelompok' || item.kategori_usia === 'Pengajar') && item.nomor_hp) {
                    const escapedNama = item.nama.replace(/'/g, "\\'"), escapedKategori = item.kategori_usia.replace(/'/g, "\\'"), escapedDesa = item.desa.replace(/'/g, "\\'"), escapedKelompok = item.kelompok.replace(/'/g, "\\'"), escapedHp = item.nomor_hp.replace(/'/g, "\\'");
                    waButtonHtml = `<button type="button" onclick="event.stopPropagation(); showContactModal('${escapedNama}', '${escapedKategori}', '${escapedDesa}', '${escapedKelompok}', '${escapedHp}')" title="Hubungi WA ${item.nama}" class="ml-2 inline-flex items-center justify-center p-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg transition-colors border border-indigo-100 shadow-sm"><svg class="w-3.5 h-3.5 fill-current"><use href="#icon-wa"/></svg></button>`;
                }

                let disBadge = item.is_disabilitas ? `<span class="ml-1 text-[9px] bg-teal-100 text-teal-800 px-1 py-0.2 rounded border border-teal-200 font-extrabold" title="Disabilitas">♿</span>` : '';

                tr.innerHTML = `
                    <td class="p-3 text-center font-bold text-slate-400">${index + 1}</td>
                    <td class="p-3 font-extrabold text-blue-700 hover:text-blue-900 cursor-pointer cell-nama group" onclick="selectGenerusForUpdate(${safeItem})" title="Klik untuk perbarui data ${item.nama}">
                        <div class="flex items-center flex-wrap">
                            <span class="group-hover:underline">${item.nama}</span>
                            ${disBadge}
                            <span class="opacity-0 group-hover:opacity-100 transition-opacity ml-1 text-[10px]">✏️</span>
                            ${waButtonHtml}
                        </div>
                        ${umurText}
                    </td>
                    <td class="p-3 text-center font-extrabold ${item.jenis_kelamin === 'L' ? 'text-blue-600' : 'text-pink-600'}">${item.jenis_kelamin}</td>
                    <td class="p-3 text-slate-700 font-semibold">${item.kategori_usia}</td>
                    <td class="p-3 text-slate-600 font-medium">${formatKelasFormal(item.kelas_formal) || '-'}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        function selectGenerusForUpdate(item) { fillFormForUpdate(item); }

        function filterNamaGenerusTable() {
            const filter = document.getElementById('searchNamaInList').value.toLowerCase();
            document.querySelectorAll('.row-Generus').forEach(row => {
                const namaCell = row.querySelector('.cell-nama');
                if (namaCell) row.style.display = namaCell.textContent.toLowerCase().includes(filter) ? '' : 'none';
            });
        }

        function fetchAndBuildRekap() {
            rekapLoader.classList.add('hidden'); 
            rekapContent.classList.remove('hidden');
            
            tableUsiaBody.innerHTML = ""; tableUsiaFoot.innerHTML = ""; tableKelasBody.innerHTML = ""; tableKelasFoot.innerHTML = "";
            const tableKelompokBody = document.getElementById('tableKelompokBody');
            tableKelompokBody.innerHTML = "";

            const data = appState.allGenerus;

            const rekapUsia = { "BALITA": { L: 0, P: 0 }, "PAUD": { L: 0, P: 0 }, "TK": { L: 0, P: 0 }, "Caberawit": { L: 0, P: 0 }, "Pra Remaja": { L: 0, P: 0 }, "Remaja": { L: 0, P: 0 }, "Usia Mandiri": { L: 0, P: 0 }, "Pengajar": { L: 0, P: 0 }, "KD Kelompok": { L: 0, P: 0 } };
            const rekapKelas = {}, rekapKlp = {}; 

            let countGenerusOnly = 0, countPengajarOnly = 0, countPJOnly = 0;
            let totalUsiaL = 0, totalUsiaP = 0, totalUsiaSemua = 0;
            let totalKelasL = 0, totalKelasP = 0, totalKelasSemua = 0;

            data.forEach(item => {
                const jk = item.jenis_kelamin, usia = item.kategori_usia;
                const kelas = item.kelas_formal ? formatKelasFormal(item.kelas_formal.trim()) : "Tidak Diisi/Pengajar";
                const dsa = item.desa || "Tanpa Desa", klp = item.kelompok || "Tanpa Kelompok", klpKey = `${dsa} - ${klp}`;

                if(!rekapKlp[klpKey]) rekapKlp[klpKey] = { dsa, klp, jml_generus: 0, L: 0, P: 0, jml_pengajar: 0, jml_pj: 0 };

                if(rekapUsia[usia]) {
                    if(jk === 'L' || jk === 'P') rekapUsia[usia][jk]++;
                    if (["BALITA", "PAUD", "TK", "Caberawit", "Pra Remaja", "Remaja", "Usia Mandiri"].includes(usia)) {
                        countGenerusOnly++; rekapKlp[klpKey].jml_generus++;
                        if(jk === 'L') rekapKlp[klpKey].L++; if(jk === 'P') rekapKlp[klpKey].P++;
                    } else if (usia === "Pengajar") { countPengajarOnly++; rekapKlp[klpKey].jml_pengajar++; }
                    else if (usia === "KD Kelompok") { countPJOnly++; rekapKlp[klpKey].jml_pj++; }
                }

                if(!rekapKelas[kelas]) rekapKelas[kelas] = { L: 0, P: 0 };
                if(jk === 'L' || jk === 'P') rekapKelas[kelas][jk]++;
            });

            rekapTotalData.className = "px-3 py-1.5 text-[10px] sm:text-xs font-extrabold text-white bg-slate-800 rounded-lg shadow-md text-left sm:text-right";
            rekapTotalData.innerHTML = `Generus: ${countGenerusOnly} | Pengajar: ${countPengajarOnly} | KD: ${countPJOnly}`;

            for (const [key, val] of Object.entries(rekapUsia)) {
                const totalRow = val.L + val.P;
                totalUsiaL += val.L; totalUsiaP += val.P; totalUsiaSemua += totalRow;

                const tr = document.createElement('tr');
                tr.className = "hover:bg-slate-100/70 transition-colors cursor-pointer text-xs clickable-row group";
                tr.onclick = () => showDetailRekapPerKategori(key);

                tr.innerHTML = `
                    <td class="p-3 sm:p-4 font-extrabold text-slate-900 group-hover:underline">${key}</td>
                    <td class="p-3 sm:p-4 text-center font-bold text-slate-700">${val.L}</td>
                    <td class="p-3 sm:p-4 text-center font-bold text-slate-700">${val.P}</td>
                    <td class="p-3 sm:p-4 text-center font-extrabold bg-indigo-50/50 text-indigo-950 total-cell-highlight">${totalRow}</td>
                `;
                tableUsiaBody.appendChild(tr);
            }
            tableUsiaFoot.innerHTML = `<td class="p-3 sm:p-4 font-extrabold text-slate-900 text-left text-xs">TOTAL AKUMULASI</td><td class="p-3 sm:p-4 text-center text-indigo-700 font-extrabold text-xs">${totalUsiaL}</td><td class="p-3 sm:p-4 text-center text-indigo-700 font-extrabold text-xs">${totalUsiaP}</td><td class="p-3 sm:p-4 text-center text-white bg-slate-800 font-extrabold shadow-inner total-cell-highlight text-xs">${totalUsiaSemua}</td>`;

            const urutanKustom = ["BALITA", "PAUD", "TK A", "TK B", "1 SD", "2 SD", "3 SD", "4 SD", "5 SD", "6 SD", "1 SMP", "2 SMP", "3 SMP", "1 SMA", "2 SMA", "3 SMA", "1 SMK", "2 SMK", "3 SMK", "1 SMA/SMK", "2 SMA/SMK", "3 SMA/SMK", "1 SMA/SMK/SMK", "2 SMA/SMK/SMK", "3 SMA/SMK/SMK", "KULIAH", "KERJA", "BELUM KERJA"];

            const sortedKelas = Object.keys(rekapKelas)
                .filter(kelasKey => kelasKey !== "Tidak Diisi/Pengajar")
                .sort((a, b) => {
                    const indexA = urutanKustom.indexOf(a.toUpperCase()), indexB = urutanKustom.indexOf(b.toUpperCase());
                    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                    if (indexA !== -1) return -1;
                    if (indexB !== -1) return 1;
                    return a.localeCompare(b);
                });

            if(sortedKelas.length === 0) {
                tableKelasBody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-400 font-medium text-xs">Belum ada data kelas formal.</td></tr>`;
            } else {
                sortedKelas.forEach((kelasKey) => {
                    const val = rekapKelas[kelasKey], totalRow = val.L + val.P;
                    totalKelasL += val.L; totalKelasP += val.P; totalKelasSemua += totalRow;

                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-slate-100/70 transition-colors cursor-pointer text-xs clickable-row group";
                    tr.onclick = () => showDetailRekapPerKelas(kelasKey);

                    tr.innerHTML = `
                        <td class="p-3 sm:p-4 font-extrabold text-slate-900 group-hover:underline">${kelasKey}</td>
                        <td class="p-3 sm:p-4 text-center font-bold text-slate-700">${val.L}</td>
                        <td class="p-3 sm:p-4 text-center font-bold text-slate-700">${val.P}</td>
                        <td class="p-3 sm:p-4 text-center font-extrabold bg-emerald-50/50 text-emerald-950 total-cell-highlight">${totalRow}</td>
                    `;
                    tableKelasBody.appendChild(tr);
                });
                tableKelasFoot.innerHTML = `<td class="p-3 sm:p-4 font-extrabold text-slate-900 text-left text-xs">TOTAL AKUMULASI</td><td class="p-3 sm:p-4 text-center text-emerald-700 font-extrabold text-xs">${totalKelasL}</td><td class="p-3 sm:p-4 text-center text-emerald-700 font-extrabold text-xs">${totalKelasP}</td><td class="p-3 sm:p-4 text-center text-white bg-slate-800 font-extrabold shadow-inner total-cell-highlight text-xs">${totalKelasSemua}</td>`;
            }

            window.globalRekapKlp = rekapKlp;

            const filterSelect = document.getElementById('filterDesaKelompok');
            if (filterSelect) {
                filterSelect.innerHTML = '<option value="ALL">Semua Kelompok</option>';
                const uniqueDesa = [...new Set(data.map(item => item.desa || "Tanpa Desa"))].sort();
                const optgroupDesa = document.createElement('optgroup');
                optgroupDesa.label = "PER DESA";
                uniqueDesa.forEach(desa => optgroupDesa.innerHTML += `<option value="DESA:${desa}">${desa}</option>`);
                filterSelect.appendChild(optgroupDesa);
            }

            if (window.applyFilterKelompok) window.applyFilterKelompok("ALL");
            updateDisabilitasGenerusCache();
        }

        window.applyFilterKelompok = function(filterVal) {
            const tableKelompokBody = document.getElementById('tableKelompokBody');
            if(!tableKelompokBody) return;
            tableKelompokBody.innerHTML = "";
            const rekapKlp = window.globalRekapKlp;
            if (!rekapKlp) return;

            const sortedKlp = Object.keys(rekapKlp).sort();
            let filteredKeys = sortedKlp;
            
            if (filterVal !== "ALL" && filterVal.startsWith("DESA:")) {
                const targetDesa = filterVal.split("DESA:")[1];
                filteredKeys = sortedKlp.filter(k => k.startsWith(targetDesa + " - "));
            }

            if (filteredKeys.length === 0) {
                tableKelompokBody.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-400 font-medium text-xs">Tidak ada rincian data untuk pilihan tersebut.</td></tr>`;
            } else {
                filteredKeys.forEach((key) => {
                    const row = rekapKlp[key];
                    const tr = document.createElement('tr');
                    tr.className = "hover:bg-slate-100/70 transition-colors cursor-pointer font-medium text-slate-800 text-xs clickable-row group";
                    tr.onclick = () => showDetailRekapNamaGenerus(row.dsa, row.klp);

                    tr.innerHTML = `
                        <td class="p-2 sm:p-2.5 font-extrabold text-slate-900 group-hover:underline sticky left-0 z-10 bg-white/95 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate" title="${row.klp}">${row.klp}</td>
                        <td class="p-1.5 sm:p-2 text-center bg-blue-50/50 font-extrabold text-blue-900 total-cell-highlight">${row.jml_generus}</td>
                        <td class="p-1.5 sm:p-2 text-center text-indigo-600 font-bold">${row.L}</td>
                        <td class="p-1.5 sm:p-2 text-center text-pink-600 font-bold">${row.P}</td>
                        <td class="p-1.5 sm:p-2 text-center bg-orange-50/50 font-extrabold text-orange-800">${row.jml_pengajar}</td>
                        <td class="p-1.5 sm:p-2 text-center bg-purple-50/50 font-extrabold text-purple-800">${row.jml_pj}</td>
                    `;
                    tableKelompokBody.appendChild(tr);
                });
            }
        };

        function showDetailRekapPerKategori(kategori) {
            document.getElementById('modalDetailRekapTitle').textContent = `Rekapan Kategori: ${kategori}`;
            document.getElementById('modalDetailRekapSubtitle').textContent = `Rincian jumlah generus ${kategori} berdasarkan desanya masing-masing`;

            const filtered = appState.allGenerus.filter(item => item.kategori_usia === kategori);
            const desaCount = {};

            Object.keys(dataWilayah).forEach(d => desaCount[d] = { L: 0, P: 0, total: 0 });

            filtered.forEach(item => {
                const d = item.desa || "Tanpa Desa";
                if(!desaCount[d]) desaCount[d] = { L: 0, P: 0, total: 0 };
                if(item.jenis_kelamin === 'L') desaCount[d].L++;
                else if(item.jenis_kelamin === 'P') desaCount[d].P++;
                desaCount[d].total++;
            });

            let html = `
                <table class="w-full text-xs text-left divide-y divide-slate-200">
                    <thead class="bg-indigo-50 text-indigo-900 font-extrabold sticky top-0 backdrop-blur-md">
                        <tr>
                            <th class="p-2.5">Nama Desa</th>
                            <th class="p-2.5 text-center">Laki-Laki</th>
                            <th class="p-2.5 text-center">Perempuan</th>
                            <th class="p-2.5 text-center bg-indigo-100">Total</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            `;

            let grandTotal = 0;
            Object.keys(desaCount).forEach(desa => {
                const row = desaCount[desa];
                grandTotal += row.total;
                html += `
                    <tr class="hover:bg-slate-50">
                        <td class="p-2.5 font-extrabold text-slate-800">${desa}</td>
                        <td class="p-2.5 text-center text-blue-600">${row.L}</td>
                        <td class="p-2.5 text-center text-pink-600">${row.P}</td>
                        <td class="p-2.5 text-center font-bold bg-slate-50">${row.total}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                    <tfoot class="bg-slate-800 text-white font-extrabold">
                        <tr>
                            <td class="p-2.5">TOTAL GENERUS</td>
                            <td colspan="3" class="p-2.5 text-center text-sm">${grandTotal} orang</td>
                        </tr>
                    </tfoot>
                </table>
            `;

            document.getElementById('modalDetailRekapContent').innerHTML = html;
            openModalDetailRekap();
        }

        function showDetailRekapPerKelas(kelas) {
            document.getElementById('modalDetailRekapTitle').textContent = `Rekapan Kelas/Status: ${kelas}`;
            document.getElementById('modalDetailRekapSubtitle').textContent = `Rincian jumlah generus ${kelas} berdasarkan kelompoknya masing-masing`;

            const filtered = appState.allGenerus.filter(item => item.kelas_formal && formatKelasFormal(item.kelas_formal.trim()) === kelas);
            const klpCount = {};

            filtered.forEach(item => {
                const kKey = `${item.desa || 'Tanpa Desa'} - ${item.kelompok || 'Tanpa Kelompok'}`;
                if(!klpCount[kKey]) klpCount[kKey] = { L: 0, P: 0, total: 0 };
                if(item.jenis_kelamin === 'L') klpCount[kKey].L++;
                else if(item.jenis_kelamin === 'P') klpCount[kKey].P++;
                klpCount[kKey].total++;
            });

            let html = `
                <table class="w-full text-xs text-left divide-y divide-slate-200">
                    <thead class="bg-emerald-50 text-emerald-900 font-extrabold sticky top-0 backdrop-blur-md">
                        <tr>
                            <th class="p-2.5">Desa & Kelompok</th>
                            <th class="p-2.5 text-center">Laki-Laki</th>
                            <th class="p-2.5 text-center">Perempuan</th>
                            <th class="p-2.5 text-center bg-emerald-100">Total</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            `;

            let grandTotal = 0;
            const sortedKlpKeys = Object.keys(klpCount).sort();

            if (sortedKlpKeys.length === 0) {
                html += `<tr><td colspan="4" class="p-4 text-center text-slate-400 italic">Tidak ada generus di kelas ini.</td></tr>`;
            } else {
                sortedKlpKeys.forEach(klp => {
                    const row = klpCount[klp];
                    grandTotal += row.total;
                    html += `
                        <tr class="hover:bg-slate-50">
                            <td class="p-2.5 font-extrabold text-slate-800">${klp}</td>
                            <td class="p-2.5 text-center text-blue-600">${row.L}</td>
                            <td class="p-2.5 text-center text-pink-600">${row.P}</td>
                            <td class="p-2.5 text-center font-bold bg-slate-50">${row.total}</td>
                        </tr>
                    `;
                });
            }

            html += `
                    </tbody>
                    <tfoot class="bg-slate-800 text-white font-extrabold">
                        <tr>
                            <td class="p-2.5">TOTAL TERDAFTAR</td>
                            <td colspan="3" class="p-2.5 text-center text-sm">${grandTotal} orang</td>
                        </tr>
                    </tfoot>
                </table>
            `;

            document.getElementById('modalDetailRekapContent').innerHTML = html;
            openModalDetailRekap();
        }

        function showDetailRekapNamaGenerus(desa, kelompok) {
            document.getElementById('modalDetailRekapTitle').textContent = `Daftar Nama: ${kelompok}`;
            document.getElementById('modalDetailRekapSubtitle').textContent = `Informasi siapa saja yang sudah terdaftar di ${desa} - ${kelompok} (View Only)`;

            const members = appState.allGenerus.filter(item => item.desa === desa && item.kelompok === kelompok);

            members.sort((a, b) => (a.nama || '').localeCompare(b.nama || '', 'id', { sensitivity: 'base' }));

            const katSummary = {};
            let countGenerus = 0, countPengajar = 0, countPJ = 0;

            members.forEach(item => {
                const kat = item.kategori_usia || 'Lainnya';
                katSummary[kat] = (katSummary[kat] || 0) + 1;

                if (['BALITA', 'PAUD', 'TK', 'Caberawit', 'Pra Remaja', 'Remaja', 'Usia Mandiri'].includes(kat)) {
                    countGenerus++;
                } else if (kat === 'Pengajar') {
                    countPengajar++;
                } else if (kat === 'KD Kelompok') {
                    countPJ++;
                }
            });

            const sortedKategoriKeys = Object.keys(katSummary).sort((a, b) => {
                let indexA = URUTAN_KATEGORI_STANDAR.indexOf(a);
                let indexB = URUTAN_KATEGORI_STANDAR.indexOf(b);
                if (indexA === -1) indexA = 99;
                if (indexB === -1) indexB = 99;
                return indexA - indexB;
            });

            let summaryCardsHtml = `
                <div class="mb-4 bg-slate-50/90 border border-slate-200/80 rounded-xl p-3 space-y-2">
                    <div class="flex flex-wrap items-center justify-between gap-1 pb-2 border-b border-slate-200/60 text-[11px] font-extrabold">
                        <span class="text-slate-700">Total Terdaftar: <span class="text-slate-900 font-black">${members.length}</span></span>
                        <div class="flex items-center gap-1.5 text-[10px]">
                            <span class="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">Generus: ${countGenerus}</span>
                            <span class="bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md">Pengajar: ${countPengajar}</span>
                            <span class="bg-purple-100 text-purple-800 px-2 py-0.5 rounded-md">KD: ${countPJ}</span>
                        </div>
                    </div>
                    <div class="flex flex-wrap gap-1.5 text-[10px] font-semibold text-slate-600 pt-0.5">
            `;

            sortedKategoriKeys.forEach(kat => {
                summaryCardsHtml += `
                    <span class="bg-white border border-slate-200 px-2 py-0.5 rounded-lg shadow-2xs">
                        <strong class="text-slate-800 font-bold">${kat}:</strong> ${katSummary[kat]}
                    </span>
                `;
            });

            summaryCardsHtml += `
                    </div>
                </div>
            `;

            let html = summaryCardsHtml + `
                <table class="w-full text-xs text-left divide-y divide-slate-200">
                    <thead class="bg-purple-100/90 text-purple-900 font-extrabold sticky top-0 z-10 backdrop-blur-md">
                        <tr>
                            <th class="p-2.5 text-center w-8">No</th>
                            <th class="p-2.5">Nama Lengkap</th>
                            <th class="p-2.5 text-center">JK</th>
                            <th class="p-2.5">Kategori</th>
                            <th class="p-2.5">Kelas/Status</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100 font-semibold text-slate-700">
            `;

            if (members.length === 0) {
                html += `<tr><td colspan="5" class="p-6 text-center text-slate-400 italic">Belum ada generus terdaftar di kelompok ini.</td></tr>`;
            } else {
                members.forEach((item, index) => {
                    let disBadge = item.is_disabilitas ? `<span class="ml-1 text-[9px] bg-teal-100 text-teal-800 px-1 py-0.2 rounded border border-teal-200 font-extrabold" title="Disabilitas">♿</span>` : '';
                    html += `
                        <tr class="hover:bg-slate-50">
                            <td class="p-2.5 text-center font-bold text-slate-400">${index + 1}</td>
                            <td class="p-2.5 font-extrabold text-slate-800 flex items-center">${item.nama}${disBadge}</td>
                            <td class="p-2.5 text-center font-extrabold ${item.jenis_kelamin === 'L' ? 'text-blue-600' : 'text-pink-600'}">${item.jenis_kelamin || '-'}</td>
                            <td class="p-2.5 text-slate-600">${item.kategori_usia || '-'}</td>
                            <td class="p-2.5 text-slate-500">${formatKelasFormal(item.kelas_formal) || '-'}</td>
                        </tr>
                    `;
                });
            }

            html += `
                    </tbody>
                </table>
            `;

            document.getElementById('modalDetailRekapContent').innerHTML = html;
            openModalDetailRekap();
        }

        /* POPUP DISABILITAS GENERUS (MENAMPILKAN USIA & DETAIL RAGAM) */
        function showDisabilitasDetailModalGenerus() {
            const dataset = appState.disabilitasGenerusList.sort((a, b) => (a.nama || '').localeCompare(b.nama || ''));

            const katCounts = {};
            dataset.forEach(item => {
                let kats = [];
                if (Array.isArray(item.kategori_disabilitas) && item.kategori_disabilitas.length > 0) {
                    kats = item.kategori_disabilitas;
                } else if (typeof item.kategori_disabilitas === 'string' && item.kategori_disabilitas.trim() !== '') {
                    kats = item.kategori_disabilitas.split(',').map(s => s.trim());
                } else {
                    kats = ['Lainnya'];
                }

                kats.forEach(k => {
                    const cleanKat = k || 'Lainnya';
                    katCounts[cleanKat] = (katCounts[cleanKat] || 0) + 1;
                });
            });

            const summaryEl = document.getElementById('disabilitasCategorySummaryGenerus');
            if (summaryEl) {
                summaryEl.innerHTML = '';
                const keys = Object.keys(katCounts);
                if (keys.length === 0) {
                    summaryEl.innerHTML = `<p class="col-span-full text-[10px] text-slate-400 font-semibold text-center py-1">Belum ada kategori terdata.</p>`;
                } else {
                    keys.forEach(kat => {
                        const badge = document.createElement('div');
                        badge.className = "p-1.5 bg-white/80 rounded-xl border border-teal-100 flex justify-between items-center";
                        badge.innerHTML = `
                            <span class="text-[10px] font-extrabold text-slate-600 truncate mr-1" title="${kat}">${kat}</span>
                            <span class="text-[10px] font-black text-teal-700 bg-teal-100 px-1.5 py-0.5 rounded-md">${katCounts[kat]}</span>
                        `;
                        summaryEl.appendChild(badge);
                    });
                }
            }

            const searchInput = document.getElementById('disabilitasDetailSearchGenerus');
            if (searchInput) searchInput.value = '';

            renderDisabilitasGenerusList(dataset);
            openModalAnimation('disabilitasDetailModal');
        }

        function renderDisabilitasGenerusList(listData) {
            const listEl = document.getElementById('disabilitasDetailListGenerus');
            listEl.innerHTML = '';

            if (!listData || listData.length === 0) {
                listEl.innerHTML = `<p class="text-xs text-slate-400 font-semibold text-center py-5">Tidak ada generus penyandang disabilitas terdaftar.</p>`;
                return;
            }

            listData.forEach(item => {
                const card = document.createElement('div');
                card.className = "p-2.5 sm:p-3 bg-gradient-to-r from-teal-50/80 to-emerald-50/80 border border-teal-100 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 hover:shadow-md transition-shadow";
                
                let katText = 'Lainnya';
                if (Array.isArray(item.kategori_disabilitas) && item.kategori_disabilitas.length > 0) {
                    katText = item.kategori_disabilitas.join(' | ');
                } else if (typeof item.kategori_disabilitas === 'string' && item.kategori_disabilitas.trim() !== '') {
                    katText = item.kategori_disabilitas;
                }

                let umurText = '';
                if (item.tanggal_lahir) {
                    const parts = item.tanggal_lahir.split('-');
                    if (parts.length === 3) {
                        const u = hitungUmurOtomatis(parts[0], parts[1], parts[2]);
                        if (u !== null) umurText = `• ${u} thn`;
                    }
                }

                card.innerHTML = `
                    <div>
                        <div class="font-extrabold text-xs sm:text-sm text-slate-800">${item.nama} (${item.kategori_usia} ${umurText})</div>
                        <div class="text-[10px] font-bold text-slate-500 mt-0.5">
                            Klp. <span class="text-teal-800 font-black">${item.kelompok}</span> (${item.desa})
                        </div>
                    </div>
                    <div class="shrink-0 text-left sm:text-right">
                        <span class="text-[9px] font-extrabold text-teal-800 bg-teal-100 border border-teal-200 px-2 py-0.5 rounded-lg inline-block">
                            ${katText}
                        </span>
                    </div>
                `;
                listEl.appendChild(card);
            });
        }

        function filterDisabilitasGenerusList() {
            const query = (document.getElementById('disabilitasDetailSearchGenerus').value || '').toLowerCase().trim();
            if (!query) {
                renderDisabilitasGenerusList(appState.disabilitasGenerusList);
                return;
            }
            const filtered = appState.disabilitasGenerusList.filter(item => {
                let katStr = Array.isArray(item.kategori_disabilitas) ? item.kategori_disabilitas.join(' ') : (item.kategori_disabilitas || '');
                return (item.nama || '').toLowerCase().includes(query) || 
                       (item.kelompok || '').toLowerCase().includes(query) ||
                       (item.kategori_usia || '').toLowerCase().includes(query) ||
                       katStr.toLowerCase().includes(query);
            });
            renderDisabilitasGenerusList(filtered);
        }

        function closeDisabilitasModalGenerus(backHistory = true) {
            closeModalAnimation('disabilitasDetailModal', backHistory);
        }

        function openModalDetailRekap() {
            modalReview.classList.add('hidden'); modalSuccess.classList.add('hidden'); modalError.classList.add('hidden'); modalContact.classList.add('hidden'); modalPjPengajarList.classList.add('hidden');
            document.getElementById('modalDetailRekap').classList.remove('hidden');
            openModalAnimation('customModal');
        }

        function cetakRekapitulasiData() {
            if (rekapContent.classList.contains('hidden')) fetchAndBuildRekap();
            window.print();
        }

        function exportToCSV() {
            const csvFilterDesa = document.getElementById('csvFilterDesa');
            csvFilterDesa.innerHTML = '<option value="">-- Pilih Desa --</option>';
            Object.keys(dataWilayah).forEach(desa => csvFilterDesa.add(new Option(desa, desa)));

            document.getElementById('csvScopeType').value = "ALL";
            handleCsvScopeChange();
            openModalAnimation('modalExportCsv');
        }

        function closeCsvModal(backHistory = true) { closeModalAnimation('modalExportCsv', backHistory); }

        function handleCsvScopeChange() {
            const scope = document.getElementById('csvScopeType').value;
            document.getElementById('csvDesaContainer').classList.toggle('hidden', scope === 'ALL');
            document.getElementById('csvKelompokContainer').classList.toggle('hidden', scope !== 'KELOMPOK');
        }

        function handleCsvDesaSelectChange() {
            updateKelompokDropdown(document.getElementById('csvFilterDesa').value, "", document.getElementById('csvFilterKelompok'), "-- Pilih Kelompok --");
        }

        function toggleAllCsvColumns(selectState) {
            document.querySelectorAll('input[name="csvCol"]').forEach(cb => cb.checked = selectState);
        }

        function fetchExportDataFromSupabase() {
            const scope = document.getElementById('csvScopeType').value;
            const selectedDesa = document.getElementById('csvFilterDesa').value;
            const selectedKelompok = document.getElementById('csvFilterKelompok').value;

            if (scope === 'DESA' && !selectedDesa) { alert("Silakan pilih Desa terlebih dahulu!"); return null; }
            if (scope === 'KELOMPOK' && (!selectedDesa || !selectedKelompok)) { alert("Silakan pilih Desa dan Kelompok terlebih dahulu!"); return null; }

            const checkedBoxes = document.querySelectorAll('input[name="csvCol"]:checked');
            if (checkedBoxes.length === 0) { alert("Pilih minimal satu kolom untuk diekspor!"); return null; }

            const selectedColumns = Array.from(checkedBoxes).map(cb => cb.value);
            let filteredData = [...appState.allGenerus];

            if (scope === 'DESA') filteredData = filteredData.filter(i => i.desa === selectedDesa);
            else if (scope === 'KELOMPOK') filteredData = filteredData.filter(i => i.desa === selectedDesa && i.kelompok === selectedKelompok);

            if (!filteredData || filteredData.length === 0) { alert("Tidak ada data ditemukan untuk kriteria filter ini!"); return null; }

            let filenameScope = scope === 'ALL' ? 'semua' : (scope === 'DESA' ? selectedDesa : `${selectedDesa}_${selectedKelompok}`);
            let baseFilename = `data_generus_${filenameScope.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0,10)}`;

            return { data: filteredData, selectedColumns, baseFilename };
        }

        async function processCustomCsvDownload() {
            const btnSubmit = document.getElementById('btnDownloadCsvSubmit');
            btnSubmit.disabled = true; btnSubmit.innerHTML = "⏳ Mengunduh...";

            try {
                const res = fetchExportDataFromSupabase();
                if (!res) return;
                const { data, selectedColumns, baseFilename } = res;

                let csvRows = [selectedColumns.join(",")];
                data.forEach(item => {
                    const row = selectedColumns.map(header => {
                        let val = item[header];
                        if (header === 'kelas_formal' && val) val = formatKelasFormal(val);
                        if (header === 'is_disabilitas') val = val ? 'Ya' : 'Tidak';
                        if (val === null || val === undefined) return '""';
                        if (Array.isArray(val)) val = val.join('; ');
                        else if (typeof val === 'object') val = JSON.stringify(val);
                        return `"${String(val).replace(/"/g, '""')}"`;
                    });
                    csvRows.push(row.join(","));
                });

                const blob = new Blob(["\uFEFF" + csvRows.join("\n")], { type: 'text/csv;charset=utf-8;' });
                const url = URL.createObjectURL(blob), a = document.createElement('a');
                a.href = url; a.download = `${baseFilename}.csv`;
                document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                closeCsvModal();
            } catch (err) {
                alert("Gagal melakukan ekspor data: " + err.message);
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg><span>Unduh CSV</span>`;
            }
        }

        async function processCustomExcelDownload() {
            const btnSubmit = document.getElementById('btnDownloadExcelSubmit');
            btnSubmit.disabled = true; btnSubmit.innerHTML = "⏳ Mengunduh...";

            try {
                const res = fetchExportDataFromSupabase();
                if (!res) return;
                const { data, selectedColumns, baseFilename } = res;

                const columnLabels = { id: "ID", nama: "Nama Lengkap", jenis_kelamin: "Jenis Kelamin", tempat_lahir: "Tempat Lahir", tanggal_lahir: "Tanggal Lahir", desa: "Desa", kelompok: "Kelompok", kategori_usia: "Kategori Usia", kelas_formal: "Kelas Formal", nomor_hp: "Nomor HP", mengajar_usia: "Mengajar Usia", is_disabilitas: "Disabilitas?", kategori_disabilitas: "Ragam Disabilitas", created_at: "Waktu Dibuat" };

                const excelData = data.map(item => {
                    let formattedItem = {};
                    selectedColumns.forEach(header => {
                        let label = columnLabels[header] || header, val = item[header];
                        if (header === 'kelas_formal' && val) val = formatKelasFormal(val);
                        if (header === 'is_disabilitas') val = val ? 'Ya' : 'Tidak';
                        if (val === null || val === undefined) val = "";
                        else if (Array.isArray(val)) val = val.join(', ');
                        else if (typeof val === 'object') val = JSON.stringify(val);
                        formattedItem[label] = val;
                    });
                    return formattedItem;
                });

                const worksheet = XLSX.utils.json_to_sheet(excelData);
                worksheet['!cols'] = selectedColumns.map(header => ({ wch: Math.max((columnLabels[header] || header).length + 5, 15) }));

                const workbook = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(workbook, worksheet, "Data Generus");
                XLSX.writeFile(workbook, `${baseFilename}.xlsx`);
                closeCsvModal();
            } catch (err) {
                alert("Gagal melakukan ekspor data Excel: " + err.message);
            } finally {
                btnSubmit.disabled = false;
                btnSubmit.innerHTML = `<svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"/></svg><span>Unduh Excel</span>`;
            }
        }

        function closeModalOnly(backHistory = true) { closeModalAnimation('customModal', backHistory); }

        function finalResetAndClose() {
            closeModalAnimation('customModal', true, () => {
                if (currentMode === "UPDATE") {
                    loadNamaGenerusKelompok(); hideElementSmooth(document.getElementById('formGenerus'));
                } else switchMode("DAFTAR");
            });
        }
        
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('./service-worker.js').catch(err => console.error(err));
            });
        }

        let activeSelectTarget = null, touchStartY = 0, touchStartX = 0, isSwiping = false;

        document.addEventListener('mousedown', interceptSelect, { capture: true });
        document.addEventListener('touchstart', e => {
            const select = e.target.closest('select');
            if (!select || select.disabled) return;
            isSwiping = false; touchStartY = e.touches[0].clientY; touchStartX = e.touches[0].clientX;
        }, { capture: true, passive: true });

        document.addEventListener('touchmove', e => {
            if (!touchStartY) return;
            if (Math.abs(e.touches[0].clientY - touchStartY) > 6 || Math.abs(e.touches[0].clientX - touchStartX) > 6) isSwiping = true;
        }, { capture: true, passive: true });

        document.addEventListener('touchend', e => {
            if (!isSwiping) interceptSelect(e);
            isSwiping = false; touchStartY = 0; touchStartX = 0;
        }, { capture: true });

        function interceptSelect(e) {
            const select = e.target.closest('select');
            if (!select || select.disabled) return;
            e.preventDefault(); e.stopPropagation();
            activeSelectTarget = select; openCenterPicker(select);
        }

        function openCenterPicker(select, pushHistory = true) {
            const modal = document.getElementById('centerPickerModal'), modalContent = modal.querySelector('div');
            const titleEl = document.getElementById('centerPickerTitle'), optionsContainer = document.getElementById('centerPickerOptions');

            if (pushHistory) history.pushState({ modal: 'centerPickerModal', menu: activeMenuState }, '', '#centerPickerModal');

            let labelText = "Pilih Opsi";
            const parent = select.closest('div');
            if (parent && parent.querySelector('label')) labelText = parent.querySelector('label').textContent;
            titleEl.textContent = labelText;

            optionsContainer.innerHTML = '';
            const hasOptGroup = select.querySelectorAll('optgroup').length > 0;

            if (hasOptGroup) {
                Array.from(select.children).forEach(child => {
                    if (child.tagName.toLowerCase() === 'option' && !child.disabled) appendPickerOptionItem(optionsContainer, child, select);
                    else if (child.tagName.toLowerCase() === 'optgroup') {
                        const groupDivider = document.createElement('div');
                        groupDivider.className = "pt-3 pb-1 px-1 border-t border-slate-200/80 mt-2 first:mt-0 first:border-0";
                        groupDivider.innerHTML = `<span class="text-[10px] font-extrabold uppercase tracking-widest text-indigo-800 bg-indigo-50 px-2.5 py-1 rounded-md inline-block border border-indigo-100/80 shadow-2xs">${child.label}</span>`;
                        optionsContainer.appendChild(groupDivider);
                        Array.from(child.children).forEach(opt => { if (!opt.disabled) appendPickerOptionItem(optionsContainer, opt, select); });
                    }
                });
            } else {
                Array.from(select.options).forEach(opt => {
                    if (!opt.disabled && !opt.classList.contains('hidden')) appendPickerOptionItem(optionsContainer, opt, select);
                });
            }

            modal.classList.remove('hidden'); void modal.offsetWidth; modal.classList.remove('opacity-0');
            modalContent.classList.remove('scale-90', 'opacity-0'); modalContent.classList.add('scale-100', 'opacity-100');
        }

        function appendPickerOptionItem(container, opt, select) {
            const item = document.createElement('button');
            item.type = "button";
            const isSelected = (opt.value === select.value);
            
            let textStyle = "text-slate-700 bg-white/40 border border-white/60";
            if (opt.value === "Menikah/Boarding/Sambung Luar Daerah") {
                textStyle = "text-rose-600 font-bold bg-rose-50 border border-rose-100";
            }

            item.className = `w-full text-left p-3 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between cursor-pointer picker-option-item ${isSelected ? 'active-selected' : textStyle}`;
            item.innerHTML = `<span>${opt.text}</span>${isSelected ? `<svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg>` : ''}`;

            item.addEventListener('click', (ev) => {
                ev.stopPropagation();
                select.value = opt.value;
                select.dispatchEvent(new Event('change', { bubbles: true }));
                closeCenterPicker();
            });

            container.appendChild(item);
        }

        function closeCenterPicker(backHistory = true) {
            const modal = document.getElementById('centerPickerModal');
            if (!modal || modal.classList.contains('hidden')) return;

            const modalContent = modal.querySelector('div');
            modal.classList.add('opacity-0');
            modalContent.classList.remove('scale-100', 'opacity-100'); modalContent.classList.add('scale-90', 'opacity-0');

            setTimeout(() => { modal.classList.add('hidden'); activeSelectTarget = null; }, 200);

            if (backHistory && window.history.state && window.history.state.modal === 'centerPickerModal') {
                window.history.back();
            }
        }
