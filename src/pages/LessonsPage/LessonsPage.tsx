import css from './LessonsPage.module.css';
import LessonsList from '../../components/sections/home/Schedule/LessonsList';

const LessonsPage = () => {
  return (
    <div className={css['lessonsPage']}>
      <LessonsList />
    </div>
  );
};

export default LessonsPage;
