/* ===========================
   Syddhi Learning - app.js
   SINGLE CLEAN FILE ✅
   - OTP first time + set password
   - Password login from 2nd time
   - Courses list + thumbnails
   - Course detail + play video (mp4)
   - Watch time tracking + continue watching
   - Dashboard progress % + watched time
   - NO Download + NO Picture-in-Picture ✅
=========================== */

const API_BASE = "http://127.0.0.1:8000";

/* ---------------- API helper ---------------- */
async function api(path, { method = "GET", body } = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    let msg = "";
    try {
      msg = (await res.json()).detail || "";
    } catch {}
    throw new Error(msg || `HTTP ${res.status}`);
  }
  return res.json();
}

function qs(name) {
  return new URLSearchParams(location.search).get(name);
}

function escapeHtml(s) {
  return String(s || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function jsString(s) {
  return String(s || "").replaceAll("\\", "\\\\").replaceAll("'", "\\'");
}

function formatTime(sec) {
  sec = Math.max(0, Number(sec || 0));
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/* ---------------- Navbar ---------------- */
function navBar(active = "") {
  return `
    <div class="nav">
      <div class="logo">
        Syddhi Learning <span class="badge">Syddhi Software Solutions</span>
      </div>
      <div class="row">
        <a class="btn ${active === "courses" ? "primary" : ""}" href="courses.html">Courses</a>
        <a class="btn ${active === "dashboard" ? "primary" : ""}" href="dashboard.html">Dashboard</a>
        <a class="btn ${active === "login" ? "primary" : ""}" href="login.html">Login</a>
        <button class="btn" onclick="logoutStudent()">Logout</button>
      </div>
    </div>
  `;
}

async function logoutStudent() {
  try {
    await api("/api/auth/logout/", { method: "POST" });
  } catch {}
  location.href = "index.html";
}

/* =========================================================
   LOGIN (OTP + Password)
========================================================= */
let OTP_EMAIL = null;

function showPanel(which) {
  const tabPwd = document.getElementById("tabPwd");
  const tabOtp = document.getElementById("tabOtp");
  const panelPwd = document.getElementById("panelPwd");
  const panelOtp = document.getElementById("panelOtp");
  if (!tabPwd || !tabOtp || !panelPwd || !panelOtp) return;

  tabPwd.classList.toggle("active", which === "pwd");
  tabOtp.classList.toggle("active", which === "otp");
  panelPwd.classList.toggle("show", which === "pwd");
  panelOtp.classList.toggle("show", which === "otp");
}

function setOtpStep(n) {
  const step1 = document.getElementById("otpStep1");
  const step2 = document.getElementById("otpStep2");
  const step3 = document.getElementById("otpStep3");
  if (step1) step1.classList.toggle("show", n === 1);
  if (step2) step2.classList.toggle("show", n === 2);
  if (step3) step3.classList.toggle("show", n === 3);
}

async function loginWithPassword() {
  const emailEl = document.getElementById("pwdEmail");
  const passEl = document.getElementById("pwdPass");
  const st = document.getElementById("pwdStatus");
  if (!emailEl || !passEl || !st) return;

  const email = emailEl.value.trim().toLowerCase();
  const password = passEl.value;

  st.textContent = "Logging in...";
  try {
    await api("/api/auth/password-login/", { method: "POST", body: { email, password } });
    st.textContent = "Logged in ✅";
    location.href = "courses.html";
  } catch (e) {
    st.textContent = e.message || "Invalid credentials";
  }
}

async function sendOtp() {
  const emailEl = document.getElementById("otpEmail");
  const st = document.getElementById("otpStatus");
  if (!emailEl || !st) return;

  const email = emailEl.value.trim().toLowerCase();
  st.textContent = "Sending OTP...";

  try {
    await api("/api/auth/send-otp/", { method: "POST", body: { email } });
    OTP_EMAIL = email;
    st.textContent = "OTP sent ✅";
    setOtpStep(2);
  } catch (e) {
    st.textContent = e.message || "Failed";
  }
}

async function verifyOtp() {
  const otpEl = document.getElementById("otpCode");
  const st = document.getElementById("verifyStatus");
  if (!otpEl || !st) return;

  const otp = otpEl.value.trim();
  st.textContent = "Verifying OTP...";

  try {
    const res = await api("/api/auth/verify-otp/", { method: "POST", body: { email: OTP_EMAIL, otp } });
    if (res.needs_password_setup) {
      st.textContent = "OTP verified ✅ Set password";
      setOtpStep(3);
    } else {
      st.textContent = "Logged in ✅";
      location.href = "courses.html";
    }
  } catch (e) {
    st.textContent = e.message || "Invalid OTP";
  }
}

async function setPassword() {
  const p1 = document.getElementById("newPass");
  const p2 = document.getElementById("newPass2");
  const st = document.getElementById("setStatus");
  if (!p1 || !p2 || !st) return;

  if (p1.value !== p2.value) {
    st.textContent = "Passwords do not match";
    return;
  }

  st.textContent = "Saving password...";
  try {
    await api("/api/auth/set-password/", { method: "POST", body: { password: p1.value } });
    st.textContent = "Saved ✅";
    location.href = "courses.html";
  } catch (e) {
    st.textContent = e.message || "Failed";
  }
}

/* =========================================================
   COURSES LIST
========================================================= */
async function loadCourses() {
  const nav = document.getElementById("navbar");
  if (nav) nav.innerHTML = navBar("courses");

  const wrap = document.getElementById("courses");
  if (!wrap) return;

  wrap.innerHTML = `<div class="small">Loading courses...</div>`;

  try {
    const courses = await api("/api/courses/");
    wrap.innerHTML = (courses || []).map(c => `
      <div class="card course lift reveal">
        <img src="${c.thumbnail_url || ""}" alt=""
             onerror="this.style.display='none'">
        <div class="p">
          <h3>${escapeHtml(c.title)}</h3>
          <div class="meta">
            <span>${escapeHtml(c.category)} • ${escapeHtml(c.level)}</span>
            <span>${c.lessons_count} lessons</span>
          </div>
          <div style="margin-top:12px" class="row">
            <a class="btn primary" href="course.html?id=${c.id}">View Course</a>
          </div>
        </div>
      </div>
    `).join("");

    setupReveal();
  } catch (e) {
    wrap.innerHTML = `<div class="small">${e.message}</div>`;
  }
}

/* =========================================================
   COURSE DETAIL + VIDEO PLAYER (NO DOWNLOAD + NO PIP)
========================================================= */
let WATCH_TIMER = null;
let LAST_SENT_AT = 0;
let LAST_TIME = 0;

function clearWatchTimer() {
  if (WATCH_TIMER) clearInterval(WATCH_TIMER);
  WATCH_TIMER = null;
  LAST_SENT_AT = 0;
  LAST_TIME = 0;
}

async function sendWatchPing(lessonId, player, { force = false, completed = false } = {}) {
  const now = Date.now();
  if (!force && now - LAST_SENT_AT < 10000) return;

  const current = Math.floor(player.currentTime || 0);
  const delta = Math.max(0, current - LAST_TIME);

  LAST_TIME = current;
  LAST_SENT_AT = now;

  if (!force && delta === 0 && current === 0) return;

  try {
    await api(`/api/lessons/${lessonId}/watch/`, {
      method: "POST",
      body: { current_time_seconds: current, delta_seconds: delta, completed }
    });
  } catch {}
}

async function enroll(courseId) {
  try {
    await api(`/api/courses/${courseId}/enroll/`, { method: "POST" });
    alert("Enrolled ✅");
    location.reload();
  } catch {
    alert("Login required");
    location.href = "login.html";
  }
}

function forceNoDownloadNoPip(videoEl) {
  if (!videoEl) return;

  // remove download & pip & remote play
  videoEl.setAttribute("controlsList", "nodownload noplaybackrate noremoteplayback");
  videoEl.setAttribute("disablePictureInPicture", "");
  videoEl.disablePictureInPicture = true;

  // block right click
  videoEl.oncontextmenu = () => false;

  // if user triggers PiP by browser, immediately exit
  videoEl.addEventListener("enterpictureinpicture", async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      }
    } catch {}
  });
}

function playLesson(lessonId, title, videoUrl, resumeSeconds) {
  const card = document.getElementById("playerCard");
  const player = document.getElementById("player");
  const src = document.getElementById("playerSrc");
  const pTitle = document.getElementById("playerTitle");
  const status = document.getElementById("playerStatus");
  const btn = document.getElementById("markBtn");

  if (!card || !player || !src || !pTitle || !status || !btn) return;

  clearWatchTimer();

  card.style.display = "block";
  pTitle.textContent = title;
  status.textContent = "";

  // enforce restrictions
  forceNoDownloadNoPip(player);

  src.src = videoUrl;
  player.load();
  player.scrollIntoView({ behavior: "smooth", block: "start" });

  player.onloadedmetadata = () => {
    const dur = player.duration || (resumeSeconds + 1);
    if (resumeSeconds && resumeSeconds > 0 && resumeSeconds < dur) {
      player.currentTime = resumeSeconds;
      LAST_TIME = resumeSeconds;
      status.textContent = `Resumed at ${formatTime(resumeSeconds)}.`;
    } else {
      LAST_TIME = Math.floor(player.currentTime || 0);
    }
  };

  WATCH_TIMER = setInterval(() => {
    sendWatchPing(lessonId, player, { force: false, completed: false });
  }, 2000);

  player.onpause = () => sendWatchPing(lessonId, player, { force: true, completed: false });
  player.onseeked = () => sendWatchPing(lessonId, player, { force: true, completed: false });

  player.onended = async () => {
    status.textContent = "Saving completion...";
    await sendWatchPing(lessonId, player, { force: true, completed: true });
    status.textContent = "Completed ✅";
  };

  btn.onclick = async () => {
    status.textContent = "Saving...";
    try {
      await api(`/api/lessons/${lessonId}/complete/`, { method: "POST" });
      await sendWatchPing(lessonId, player, { force: true, completed: true });
      status.textContent = "Marked completed ✅";
    } catch {
      status.textContent = "Login required";
      location.href = "login.html";
    }
  };
}

async function loadCourse() {
  const nav = document.getElementById("navbar");
  if (nav) nav.innerHTML = navBar("courses");

  const id = qs("id");
  const box = document.getElementById("courseBox");
  if (!box) return;

  if (!id) {
    box.innerHTML = `<div class="card"><div class="small">Course ID missing</div></div>`;
    return;
  }

  box.innerHTML = `<div class="small">Loading course...</div>`;

  try {
    const c = await api(`/api/courses/${id}/`);

    box.innerHTML = `
      <div class="card lift reveal">
        <div class="row" style="justify-content:space-between;align-items:flex-start">
          <div>
            <h2 style="margin:0 0 6px">${escapeHtml(c.title)}</h2>
            <div class="small">${escapeHtml(c.category)} • ${escapeHtml(c.level)}</div>
          </div>
          <button class="btn primary" onclick="enroll(${c.id})">${c.is_enrolled ? "Enrolled ✅" : "Enroll"}</button>
        </div>
        <p class="small" style="margin-top:10px">${escapeHtml(c.description)}</p>
      </div>

      <div style="height:14px"></div>

      <div class="card lift reveal">
        <h3 style="margin-top:0">Lessons</h3>
        <div id="lessons"></div>
      </div>

      <div style="height:14px"></div>

      <div class="card lift reveal" id="playerCard" style="display:none">
        <h3 style="margin-top:0" id="playerTitle"></h3>

        <video
          id="player"
          controls
          preload="metadata"
          controlsList="nodownload noplaybackrate noremoteplayback"
          disablePictureInPicture
          oncontextmenu="return false;"
        >
          <source id="playerSrc" src="" type="video/mp4">
        </video>

        <div class="row" style="margin-top:12px">
          <button class="btn primary" id="markBtn">Mark Completed</button>
        </div>
        <div class="small" id="playerStatus" style="margin-top:8px"></div>
      </div>
    `;

    // enforce again after rendering
    forceNoDownloadNoPip(document.getElementById("player"));

    const lessonsEl = document.getElementById("lessons");
    lessonsEl.innerHTML = (c.lessons || [])
      .map(l => `
        <div class="card lift reveal" style="margin:10px 0;padding:12px">
          <div class="row" style="justify-content:space-between;align-items:center">
            <div>
              <b>#${l.order}. ${escapeHtml(l.title)}</b>
              <div class="small">
                ${l.duration_minutes} min
                ${l.completed ? " • ✅ Completed" : ""}
                ${(!l.completed && l.last_position_seconds > 0) ? ` • Resume at ${formatTime(l.last_position_seconds)}` : ""}
              </div>
            </div>
            <button class="btn"
              onclick="playLesson(${l.id}, '${jsString(l.title)}', '${jsString(l.video_url)}', ${l.last_position_seconds || 0})">
              ${(!l.completed && l.last_position_seconds > 0) ? "Resume" : "Play"}
            </button>
          </div>
        </div>
      `).join("");

    setupReveal();
  } catch (e) {
    box.innerHTML = `<div class="card"><div class="small">${e.message}</div></div>`;
  }
}

/* =========================================================
   DASHBOARD (progress % + watched time)
========================================================= */
async function loadDashboard() {
  const nav = document.getElementById("navbar");
  if (nav) nav.innerHTML = navBar("dashboard");

  const box = document.getElementById("dash");
  if (!box) return;

  box.innerHTML = `<div class="card"><div class="small">Loading dashboard...</div></div>`;

  try {
    const d = await api("/api/me/dashboard/");

    const overall =
      d.courses && d.courses.length
        ? Math.round(d.courses.reduce((a, x) => a + (x.progress_percent || 0), 0) / d.courses.length)
        : 0;

    const continueHtml =
      d.continue_watching && d.continue_watching.length
        ? `
        <div class="card lift reveal">
          <h3 style="margin-top:0">Continue Watching</h3>
          ${d.continue_watching.map(x => `
            <div class="card lift reveal" style="margin:10px 0;padding:12px">
              <b>${escapeHtml(x.course_title)}</b>
              <div class="small">Lesson: ${escapeHtml(x.lesson_title)} • Resume at ${formatTime(x.last_position_seconds)}</div>
              <div style="height:10px"></div>
              <a class="btn primary" href="course.html?id=${x.course_id}">Resume</a>
            </div>
          `).join("")}
        </div>
        <div style="height:14px"></div>
      `
        : "";

    box.innerHTML = `
      <div class="card lift reveal">
        <h2 style="margin:0 0 6px">Welcome</h2>
        <div class="small">${escapeHtml(d.email)}</div>

        <div style="height:12px"></div>

        <div class="row">
          <div class="card" style="margin:0;padding:12px;flex:1">
            <b>${d.enrolled_count}</b>
            <div class="small">Courses enrolled</div>
          </div>

          <div class="card" style="margin:0;padding:12px;flex:1">
            <b>${overall}%</b>
            <div class="small">Overall progress</div>
          </div>
        </div>
      </div>

      <div style="height:14px"></div>

      ${continueHtml}

      <div class="card lift reveal">
        <h3 style="margin-top:0">Your Courses</h3>
        ${(d.courses || []).length === 0 ? `<div class="small">No enrollments yet.</div>` : ""}

        ${(d.courses || []).map(c => `
          <div class="card lift reveal" style="margin:10px 0;padding:12px">
            <div class="row" style="justify-content:space-between;align-items:center">
              <div>
                <b>${escapeHtml(c.title)}</b>
                <div class="small">${c.completed_lessons}/${c.total_lessons} lessons completed</div>
                <div class="small">Watched: ${formatTime(c.watched_seconds_total || 0)}</div>
              </div>
              <a class="btn" href="course.html?id=${c.course_id}">Open</a>
            </div>

            <div style="height:10px"></div>
            <div class="progress"><div style="width:${c.progress_percent || 0}%"></div></div>
            <div class="small" style="margin-top:6px">${c.progress_percent || 0}% completed</div>
          </div>
        `).join("")}
      </div>
    `;

    setupReveal();
  } catch (e) {
    box.innerHTML = `
      <div class="card lift reveal">
        <div class="small">You are not logged in. Login first.</div>
        <div style="height:10px"></div>
        <a class="btn primary" href="login.html">Go to Login</a>
      </div>
    `;
    setupReveal();
  }
}

/* =========================================================
   Reveal animation
========================================================= */
function setupReveal() {
  const els = document.querySelectorAll(".reveal");
  if (!("IntersectionObserver" in window) || els.length === 0) {
    els.forEach((el) => el.classList.add("show"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add("show");
          io.unobserve(e.target);
        }
      }
    },
    { threshold: 0.12 }
  );
  els.forEach((el) => io.observe(el));
}

/* expose for inline onclick */
window.navBar = navBar;
window.logoutStudent = logoutStudent;

window.showPanel = showPanel;
window.setOtpStep = setOtpStep;
window.loginWithPassword = loginWithPassword;
window.sendOtp = sendOtp;
window.verifyOtp = verifyOtp;
window.setPassword = setPassword;

window.loadCourses = loadCourses;
window.loadCourse = loadCourse;
window.loadDashboard = loadDashboard;
window.enroll = enroll;
window.playLesson = playLesson;

window.setupReveal = setupReveal;
