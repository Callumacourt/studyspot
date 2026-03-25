import styles from "../styles/Pages/About.module.css";
import studyRoomImg from "../assets/images/study-room.jpg";
import studentsImg from "../assets/images/study-group.jpg";

export default function About() {
    return (
        <main className={styles.aboutPage}>
            <section className={styles.section}>
                <div className={styles.textBlock}>
                    <h1>What is StudySpot?</h1>
                    <p>
                        StudySpot is a platform designed to help students quickly
                        find suitable places to study based on their needs and
                        preferences. Whether a student is looking for a quiet
                        individual space or a more collaborative environment,
                        StudySpot makes it easier to locate the right place at
                        the right time.
                    </p>
                    <p>
                        The system can present useful information such as study
                        space availability, environmental conditions, and other
                        factors that may affect comfort and productivity. This
                        helps students make faster and more informed decisions.
                    </p>
                </div>

                <div className={styles.imageBlock}>
                    <img src={studyRoomImg} alt="Study room with computers" />
                </div>
            </section>

            <section className={`${styles.section} ${styles.reverseSection}`}>
                <div className={styles.imageBlock}>
                    <img src={studentsImg} alt="Students studying together" />
                </div>

                <div className={styles.textBlock}>
                    <h2>How do we help students succeed?</h2>
                    <p>
                        StudySpot supports students by reducing the time spent
                        searching for an appropriate study environment. Instead
                        of moving between different spaces without knowing what
                        is available, students can access clear and relevant
                        information in one place.
                    </p>
                    <p>
                        By improving access to suitable study areas, StudySpot
                        aims to support concentration, comfort, and productivity.
                        This can help students build better study habits and
                        improve their overall learning experience.
                    </p>
                </div>
            </section>
        </main>
    );
}