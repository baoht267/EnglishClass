import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../state/AuthContext.jsx";

export default function Home() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const role = user?.role;
  const isGuest = !role;
  const isUser = role === "USER";
  const isAdmin = role === "ADMIN";
  const showUserActions = isGuest || isUser;

  const goOrLogin = (path) => {
    if (isGuest) {
      navigate("/login");
      return;
    }
    navigate(path);
  };

  const openPractice = () => {
    if (isGuest) {
      navigate("/login");
      return;
    }
    navigate("/user/practice");
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const courses = [
    {
      title: "IELTS Academic Prep",
      level: "Advanced",
      time: "40 Hours",
      students: "1.2k Students",
      tag: "IELTS",
      image: "/portal/course_ielts.png",
    },
    {
      title: "Business English",
      level: "Intermediate",
      time: "25 Hours",
      students: "850 Students",
      tag: "Business",
      image: "/portal/course_business.png",
    },
    {
      title: "Essential Grammar",
      level: "Beginner",
      time: "15 Hours",
      students: "3.5k Students",
      tag: "General",
      image: "/portal/course_grammar.png",
    },
    {
      title: "TOEIC Master Class",
      level: "Advanced",
      time: "30 Hours",
      students: "900 Students",
      tag: "TOEIC",
      image: "/portal/course_toeic.png",
    },
  ];

  const mockExams = [
    { title: "IELTS Full Mock Test #42", time: "2h 45m", tag: "Added Today", color: "red" },
    { title: "TOEIC Listening Practice - June", time: "45m", tag: "2 days ago", color: "blue" },
    { title: "Advanced Grammar Sprint", time: "15m", tag: "1 week ago", color: "green" },
  ];

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredCourses = normalizedSearch
    ? courses.filter((course) => course.title.toLowerCase().includes(normalizedSearch))
    : courses;
  const filteredExams = normalizedSearch
    ? mockExams.filter((exam) => exam.title.toLowerCase().includes(normalizedSearch))
    : mockExams;

  return (
    <div className="portalPage">
      <header className="portalTopbar">
        <div className="portalShell portalTopbarInner">
          <div className="portalBrand">
            <span className="portalLogo">
              <img className="portalLogoImg" src="/logo.png" alt="English Portal" />
            </span>
            <span>English Portal</span>
          </div>
          <nav className="portalNav">
            <button type="button" onClick={() => navigate("/user")}>
              Home
            </button>
            <button type="button" onClick={openPractice}>
              Practice
            </button>
            <button type="button" onClick={() => goOrLogin("/user/exams")}>
              Exams
            </button>
            <button type="button" onClick={() => goOrLogin("/user/profile?tab=history")}>
              History
            </button>
          </nav>
          <div className="portalActions">
            <label className="portalSearch">
              <span className="material-symbols-outlined portalIcon">search</span>
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search courses or exams..."
                aria-label="Search courses or exams"
              />
            </label>
            <span className="material-symbols-outlined portalIcon">notifications</span>
            {isGuest && (
              <Link to="/login" className="portalBtn">
                Login
              </Link>
            )}
            {isUser && (
              <button className="portalBtn" onClick={() => navigate("/user/profile")}>
                {user?.name || "Profile"}
              </button>
            )}
            {isAdmin && (
              <button className="portalBtn" onClick={() => navigate("/admin/dashboard")}>
                Go to manage
              </button>
            )}
            {!isGuest && (
              <button
                className="portalBtn portalBtnDanger"
                onClick={handleLogout}
                style={{ background: "#ef4444", borderColor: "#ef4444", color: "#fff" }}
              >
                Logout
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="portalMain" id="home">
        <section className="portalHero">
          <div className="portalShell portalHeroGrid">
            <div className="portalHeroContent">
              <span className="portalBadge">● New TOEIC Mock Test Available</span>
              <h1>
                Master English
                <br />
                with <span>Confidence</span>
              </h1>
              <p>
                Join thousands of students acing their IELTS and TOEIC exams. Access unlimited
                practice questions and detailed analytics.
              </p>
              <div className="portalHeroActions">
                <button className="portalPrimary" type="button" onClick={openPractice}>
                  Start Practice →
                </button>
                <button className="portalGhost" type="button" onClick={() => goOrLogin("/user/exams")}>
                  Take Mock Test
                </button>
              </div>
              <div className="portalHeroMeta">
                <div className="portalAvatars">
                  <img src="/portal/avatar1.png" alt="Student 1" />
                  <img src="/portal/avatar2.png" alt="Student 2" />
                  <img src="/portal/avatar3.png" alt="Student 3" />
                  <span className="portalAvatarPlus">+2k</span>
                </div>
                <span>Students learning today</span>
              </div>
            </div>
            <div className="portalHeroArt">
              <div className="portalIllustration" />
            </div>
          </div>
        </section>

        <section className="portalStats">
          <div className="portalShell portalStatGrid">
            <div className="portalStatCard">
              <div className="portalStatIcon portalStatIcon--blue">📘</div>
              <div>
                <div className="portalStatLabel">Questions Solved</div>
                <div className="portalStatValue">10,000+</div>
              </div>
            </div>
            <div className="portalStatCard">
              <div className="portalStatIcon portalStatIcon--green">👥</div>
              <div>
                <div className="portalStatLabel">Active Users</div>
                <div className="portalStatValue">500+</div>
              </div>
            </div>
            <div className="portalStatCard">
              <div className="portalStatIcon portalStatIcon--purple">✅</div>
              <div>
                <div className="portalStatLabel">Tests Taken</div>
                <div className="portalStatValue">1,200</div>
              </div>
            </div>
            <div className="portalStatCard">
              <div className="portalStatIcon portalStatIcon--orange">🏆</div>
              <div>
                <div className="portalStatLabel">Avg. Score</div>
                <div className="portalStatValue">85%</div>
              </div>
            </div>
          </div>
        </section>

        <section className="portalContent">
          <div className="portalShell portalContentGrid">
            <div className="portalCourses">
              <div className="portalSectionHeader">
                <h2>Featured Courses</h2>
                <button className="portalLink" type="button">
                  View All
                </button>
              </div>
              <div className="portalCourseGrid">
                {filteredCourses.map((course) => (
                  <div className="portalCourseCard" key={course.title}>
                    <div
                      className="portalCourseThumb"
                      style={{ backgroundImage: `url(${course.image})` }}
                    >
                      <span>{course.tag}</span>
                    </div>
                    <div className="portalCourseBody">
                      <div className="portalCourseTop">
                        <h3>{course.title}</h3>
                        <span className="portalCourseLevel">{course.level}</span>
                      </div>
                      <p>
                        Complete preparation for the academic module with practice tests and
                        speaking guides.
                      </p>
                      <div className="portalCourseMeta">
                        <span>⏱ {course.time}</span>
                        <span>👥 {course.students}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="portalSectionHeader portalSectionHeader--compact">
                <h2>Latest Mock Exams</h2>
              </div>
              <div className="portalExamList">
                {filteredExams.map((item) => (
                  <div className="portalExamRow" key={item.title}>
                    <div className={`portalExamIcon portalExamIcon--${item.color}`}>
                      {item.title[0]}
                    </div>
                    <div className="portalExamInfo">
                      <h4>{item.title}</h4>
                      <p>
                        ⏱ {item.time} · {item.tag}
                      </p>
                    </div>
                    <button className="portalMiniBtn" type="button" onClick={() => goOrLogin("/user/exams")}>
                      Start Test
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <aside className="portalSidebar">
              <div className="portalSideCard">
                <h3>Daily Goal</h3>
                <div className="portalGoalRow">
                  <span>Questions Solved</span>
                  <strong>15/20</strong>
                </div>
                <div className="portalProgress">
                  <span />
                </div>
                <p className="portalSideNote">Keep going! You're almost there.</p>
              </div>
              <div className="portalSideCard">
                <div className="portalSideHeader">
                  <h3>Top Performers</h3>
                  <span>This Week</span>
                </div>
                <ol className="portalLeader">
                  <li>
                    <span>1</span>
                    <img src="/portal/leader1.png" alt="Sarah J." />
                    <div>
                      <strong>Sarah J.</strong>
                      <small>9850 Points</small>
                    </div>
                  </li>
                  <li>
                    <span>2</span>
                    <img src="/portal/leader2.png" alt="Mike T." />
                    <div>
                      <strong>Mike T.</strong>
                      <small>9420 Points</small>
                    </div>
                  </li>
                  <li>
                    <span>3</span>
                    <img src="/portal/leader3.png" alt="Emma W." />
                    <div>
                      <strong>Emma W.</strong>
                      <small>8900 Points</small>
                    </div>
                  </li>
                  <li>
                    <span>4</span>
                    <img src="/portal/leader4.png" alt="David L." />
                    <div>
                      <strong>David L.</strong>
                      <small>8540 Points</small>
                    </div>
                  </li>
                </ol>
                <button className="portalLink" type="button">
                  View Full Leaderboard
                </button>
              </div>
              <div className="portalSideCard portalTip">
                <h3>Tip of the Day</h3>
                <p>Use context clues to understand new vocabulary words.</p>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <footer className="portalFooter">
        <div className="portalShell portalFooterGrid">
          <div>
            <h4>English Portal</h4>
            <p>
              Empowering students worldwide to achieve their English language goals through
              interactive learning.
            </p>
          </div>
          <div>
            <h4>Platform</h4>
            <a href="#home">About Us</a>
            <a href="#pricing">Pricing</a>
            <a href="#schools">For Schools</a>
          </div>
          <div>
            <h4>Support</h4>
            <a href="#help">Help Center</a>
            <a href="#contact">Contact Us</a>
            <a href="#terms">Terms of Service</a>
          </div>
          <div>
            <h4>Connect</h4>
            <div className="portalSocial">
              <span>🌐</span>
              <span>✉️</span>
              <span>📷</span>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
