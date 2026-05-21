import React, { useState, useEffect } from 'react';
import { QuizzResponse } from '../../types/quizz.type';
import { resolveCanonicalRoomId } from '../../libs/normalize-socket-message';
import { getQuizMessagePermissions } from '../../libs/quiz-permissions';
import QuizCard from './quiz-card';
import TakeQuizzModal from '../modals/TakeQuizzModal';
import QuizResults from '../modals/QuizResults';
import EditQuizzModal from '../modals/EditQuizzModal';
import useAuthStore from '../../store/useAuth';

interface QuizMessageCardProps {
  quiz: QuizzResponse;
  isSender?: boolean;
  roomId?: string;
}

export default function QuizMessageCard({ quiz, isSender = false, roomId }: QuizMessageCardProps) {
  const { user } = useAuthStore();
  const [liveQuiz, setLiveQuiz] = useState(quiz);
  const [takingVisible, setTakingVisible] = useState(false);
  const [resultsVisible, setResultsVisible] = useState(false);
  const [editVisible, setEditVisible] = useState(false);

  useEffect(() => {
    setLiveQuiz(quiz);
  }, [quiz]);

  const canonicalRoomId = roomId ? resolveCanonicalRoomId(roomId) : undefined;
  const perms = getQuizMessagePermissions(liveQuiz, user, isSender, canonicalRoomId);

  const handlePress = () => {
    if (!perms.canOpen) return;
    if (isSender && perms.isDraft) {
      setEditVisible(true);
    } else if (perms.showAsViewResults) {
      setResultsVisible(true);
    } else if (perms.canTake) {
      setTakingVisible(true);
    }
  };

  const handleEdit = () => {
    if (!perms.senderCanEdit) return;
    setEditVisible(true);
  };

  const handleViewResults = () => {
    if (!perms.showAsViewResults && !(isSender && !perms.isDraft)) return;
    if (!perms.canOpen && !perms.showAsViewResults) return;
    setResultsVisible(true);
  };

  return (
    <>
      <QuizCard
        quiz={liveQuiz}
        isMine={isSender}
        isDraft={perms.isDraft}
        hasCompleted={perms.hasCompleted}
        canOpen={perms.canOpen}
        showAsViewResults={perms.showAsViewResults}
        senderCanEdit={perms.senderCanEdit}
        onPress={handlePress}
        onEdit={handleEdit}
        onViewResults={handleViewResults}
      />

      {takingVisible && (
        <TakeQuizzModal
          isOpen={takingVisible}
          onClose={() => setTakingVisible(false)}
          quiz={liveQuiz}
          userId={user?._id || user?.id || ''}
          userFullname={user?.fullname || ''}
          userAvatar={user?.avatar}
          hasCompleted={perms.hasCompleted}
          roomId={canonicalRoomId}
          onSubmitted={(updated) => setLiveQuiz(updated)}
        />
      )}

      {resultsVisible && (perms.showAsViewResults || (isSender && !perms.isDraft)) && (
        <QuizResults
          isOpen={resultsVisible}
          onClose={() => setResultsVisible(false)}
          quiz={liveQuiz}
          userId={user?._id || user?.id}
        />
      )}

      {editVisible && perms.senderCanEdit && canonicalRoomId && (
        <EditQuizzModal
          isOpen={editVisible}
          onClose={() => setEditVisible(false)}
          quiz={liveQuiz}
          roomId={canonicalRoomId}
          onUpdated={(updated) => setLiveQuiz(updated)}
        />
      )}
    </>
  );
}
