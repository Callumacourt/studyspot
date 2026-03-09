import styles from "../styles/Pages/Home.module.css"

export default function Home () {

    return (
        <main className = {styles.content}>
            <section className = {styles.navButtons}>
                <button>Find me a quiet spot</button>
                <button>Filter rooms</button>
            </section>
            <section className = {styles.campusMap}>
                <button className={styles.roomButton} style={{top: '10%', left: '15%'}}>Room A101</button>
                <button className={styles.roomButton} style={{top: '10%', left: '50%'}}>Room A102</button>
                <button className={styles.roomButton} style={{top: '10%', left: '75%'}}>Room A103</button>
                <button className={styles.roomButton} style={{top: '35%', left: '20%'}}>Room B201</button>
                <button className={styles.roomButton} style={{top: '35%', left: '60%'}}>Room B202</button>
                <button className={styles.roomButton} style={{top: '60%', left: '10%'}}>Room C301</button>
                <button className={styles.roomButton} style={{top: '60%', left: '45%'}}>Room C302</button>
                <button className={styles.roomButton} style={{top: '60%', left: '70%'}}>Room C303</button>
                <button className={styles.roomButton} style={{top: '80%', left: '30%'}}>Library</button>
                <button className={styles.roomButton} style={{top: '80%', left: '65%'}}>Study Hall</button>
            </section>
        </main>
    )
}