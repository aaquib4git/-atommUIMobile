import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, Modal, Pressable } from 'react-native';
import { useTheme } from '@/hooks/useTheme';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { ChevronLeft, ChevronRight, Clock, X, Eye, CircleCheck as CheckCircle, Circle, Bookmark, ChartBar as BarChart3 } from 'lucide-react-native';
import MathRenderer from '@/components/common/MathRenderer';

type TestQuestion = {
  question_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  explanation?: string;
  exam_type: string;
  exam_year: string;
};

type QuestionStatus = 'unseen' | 'seen' | 'attempted' | 'marked';

type TestInterfaceProps = {
  questions: TestQuestion[];
  testName: string;
  testDuration: number; // in minutes
  onSubmit: (answers: { [questionId: string]: string }, timeSpent: number) => void;
  onExit: () => void;
};

export default function TestInterface({ 
  questions, 
  testName, 
  testDuration, 
  onSubmit, 
  onExit 
}: TestInterfaceProps) {
  const { colors } = useTheme();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<{ [questionId: string]: string }>({});
  const [questionStatuses, setQuestionStatuses] = useState<{ [questionId: string]: QuestionStatus }>({});
  const [markedQuestions, setMarkedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(testDuration * 60); // Convert to seconds
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          // Auto-submit when time runs out
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Initialize question statuses
  useEffect(() => {
    const initialStatuses: { [questionId: string]: QuestionStatus } = {};
    questions.forEach((question, index) => {
      initialStatuses[question.question_id] = index === 0 ? 'seen' : 'unseen';
    });
    setQuestionStatuses(initialStatuses);
  }, [questions]);

  const currentQuestion = questions[currentQuestionIndex];

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = () => {
    if (timeRemaining <= 300) return colors.danger; // Last 5 minutes
    if (timeRemaining <= 600) return colors.warning; // Last 10 minutes
    return colors.text;
  };

  const handleAnswerSelect = (answer: string) => {
    const questionId = currentQuestion.question_id;
    setSelectedAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
    
    // Update status to attempted
    setQuestionStatuses(prev => ({
      ...prev,
      [questionId]: 'attempted'
    }));
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      const nextIndex = currentQuestionIndex + 1;
      setCurrentQuestionIndex(nextIndex);
      
      // Mark next question as seen if it was unseen
      const nextQuestionId = questions[nextIndex].question_id;
      setQuestionStatuses(prev => ({
        ...prev,
        [nextQuestionId]: prev[nextQuestionId] === 'unseen' ? 'seen' : prev[nextQuestionId]
      }));
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleQuestionJump = (index: number) => {
    setCurrentQuestionIndex(index);
    const questionId = questions[index].question_id;
    
    // Mark as seen if it was unseen
    setQuestionStatuses(prev => ({
      ...prev,
      [questionId]: prev[questionId] === 'unseen' ? 'seen' : prev[questionId]
    }));
    
    setShowStatusModal(false);
  };

  const handleMarkQuestion = () => {
    const questionId = currentQuestion.question_id;
    const newMarked = new Set(markedQuestions);
    
    if (newMarked.has(questionId)) {
      newMarked.delete(questionId);
      // Revert to previous status
      const hasAnswer = selectedAnswers[questionId];
      setQuestionStatuses(prev => ({
        ...prev,
        [questionId]: hasAnswer ? 'attempted' : 'seen'
      }));
    } else {
      newMarked.add(questionId);
      setQuestionStatuses(prev => ({
        ...prev,
        [questionId]: 'marked'
      }));
    }
    
    setMarkedQuestions(newMarked);
  };

  const handleSubmitTest = () => {
    const timeSpent = (testDuration * 60) - timeRemaining;
    onSubmit(selectedAnswers, timeSpent);
  };

  const getQuestionStats = () => {
    const stats = {
      attempted: 0,
      seen: 0,
      unseen: 0,
      marked: 0,
      correct: 0,
      incorrect: 0
    };

    Object.values(questionStatuses).forEach(status => {
      stats[status]++;
    });

    stats.marked = markedQuestions.size;

    return stats;
  };

  const getStatusIcon = (status: QuestionStatus, questionId: string) => {
    const isMarked = markedQuestions.has(questionId);
    
    if (isMarked) {
      return <Bookmark size={16} color={colors.warning} fill={colors.warning} />;
    }
    
    switch (status) {
      case 'attempted':
        return <CheckCircle size={16} color={colors.success} />;
      case 'seen':
        return <Eye size={16} color={colors.primary} />;
      default:
        return <Circle size={16} color={colors.textSecondary} />;
    }
  };

  const getStatusColor = (status: QuestionStatus, questionId: string) => {
    const isMarked = markedQuestions.has(questionId);
    
    if (isMarked) return colors.warning;
    
    switch (status) {
      case 'attempted':
        return colors.success;
      case 'seen':
        return colors.primary;
      default:
        return colors.textSecondary;
    }
  };

  const renderStatusModal = () => (
    <Modal
      visible={showStatusModal}
      transparent
      animationType="slide"
      onRequestClose={() => setShowStatusModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.statusModal, { backgroundColor: colors.cardBackground }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Question Status</Text>
            <TouchableOpacity onPress={() => setShowStatusModal(false)}>
              <X size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Stats Summary */}
          <View style={styles.statsContainer}>
            <View style={styles.statsRow}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.success }]}>
                  {getQuestionStats().attempted}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Attempted</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {getQuestionStats().seen}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Seen</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.textSecondary }]}>
                  {getQuestionStats().unseen}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Unseen</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: colors.warning }]}>
                  {getQuestionStats().marked}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Marked</Text>
              </View>
            </View>
          </View>

          {/* Question Grid */}
          <ScrollView style={styles.questionGrid} showsVerticalScrollIndicator={false}>
            <View style={styles.gridContainer}>
              {questions.map((question, index) => {
                const status = questionStatuses[question.question_id];
                const isCurrentQuestion = index === currentQuestionIndex;
                
                return (
                  <TouchableOpacity
                    key={question.question_id}
                    style={[
                      styles.questionGridItem,
                      {
                        backgroundColor: isCurrentQuestion 
                          ? colors.primary 
                          : getStatusColor(status, question.question_id) + '20',
                        borderColor: getStatusColor(status, question.question_id),
                      }
                    ]}
                    onPress={() => handleQuestionJump(index)}
                  >
                    <Text style={[
                      styles.questionNumber,
                      { 
                        color: isCurrentQuestion 
                          ? '#fff' 
                          : getStatusColor(status, question.question_id)
                      }
                    ]}>
                      {index + 1}
                    </Text>
                    <View style={styles.statusIconContainer}>
                      {getStatusIcon(status, question.question_id)}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  const renderSubmitConfirmModal = () => (
    <Modal
      visible={showSubmitConfirm}
      transparent
      animationType="fade"
      onRequestClose={() => setShowSubmitConfirm(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.confirmModal, { backgroundColor: colors.cardBackground }]}>
          <Text style={[styles.confirmTitle, { color: colors.text }]}>Submit Test?</Text>
          <Text style={[styles.confirmMessage, { color: colors.textSecondary }]}>
            Are you sure you want to submit your test? You won't be able to make changes after submission.
          </Text>
          
          <View style={styles.confirmStats}>
            <Text style={[styles.confirmStatsText, { color: colors.textSecondary }]}>
              Attempted: {getQuestionStats().attempted}/{questions.length}
            </Text>
            <Text style={[styles.confirmStatsText, { color: colors.textSecondary }]}>
              Time Remaining: {formatTime(timeRemaining)}
            </Text>
          </View>

          <View style={styles.confirmButtons}>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.textSecondary }]}
              onPress={() => setShowSubmitConfirm(false)}
            >
              <Text style={styles.confirmButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.confirmButton, { backgroundColor: colors.success }]}
              onPress={handleSubmitTest}
            >
              <Text style={styles.confirmButtonText}>Submit</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.cardBackground, borderBottomColor: colors.border }]}>
        <View style={styles.headerLeft}>
          <Text style={[styles.testTitle, { color: colors.text }]}>{testName}</Text>
          <Text style={[styles.questionCounter, { color: colors.textSecondary }]}>
            {currentQuestionIndex + 1} of {questions.length}
          </Text>
        </View>
        
        <View style={styles.headerRight}>
          <View style={[styles.timerContainer, { backgroundColor: getTimerColor() + '20' }]}>
            <Clock size={16} color={getTimerColor()} />
            <Text style={[styles.timerText, { color: getTimerColor() }]}>
              {formatTime(timeRemaining)}
            </Text>
          </View>
          
          <TouchableOpacity
            style={[styles.statusButton, { backgroundColor: colors.primary + '20' }]}
            onPress={() => setShowStatusModal(true)}
          >
            <BarChart3 size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Question Content */}
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <Animated.View 
          key={currentQuestion.question_id}
          entering={FadeIn.duration(300)}
          style={[styles.questionCard, { backgroundColor: colors.cardBackground }]}
        >
          <View style={styles.questionHeader}>
            <Text style={[styles.questionNumber, { color: colors.primary }]}>
              Question {currentQuestionIndex + 1}
            </Text>
            <TouchableOpacity onPress={handleMarkQuestion}>
              <Bookmark 
                size={24} 
                color={markedQuestions.has(currentQuestion.question_id) ? colors.warning : colors.textSecondary}
                fill={markedQuestions.has(currentQuestion.question_id) ? colors.warning : 'transparent'}
              />
            </TouchableOpacity>
          </View>
          
          <View style={styles.questionTextContainer}>
            <MathRenderer content={currentQuestion.question_text} color={colors.text} />
          </View>

          <View style={styles.examInfo}>
            <View style={[styles.examTag, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.examTagText, { color: colors.primary }]}>
                {currentQuestion.exam_type}
              </Text>
            </View>
            <Text style={[styles.examYear, { color: colors.textSecondary }]}>
              {currentQuestion.exam_year}
            </Text>
          </View>
        </Animated.View>

        {/* Options */}
        <View style={styles.optionsContainer}>
          {['option_a', 'option_b', 'option_c', 'option_d'].map((optionKey, index) => {
            const optionValue = currentQuestion[optionKey as keyof TestQuestion] as string;
            const optionLabel = String.fromCharCode(65 + index);
            const isSelected = selectedAnswers[currentQuestion.question_id] === optionValue;

            return (
              <Animated.View
                key={optionKey}
                entering={FadeIn.duration(300).delay(index * 100)}
              >
                <TouchableOpacity
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isSelected ? colors.primary + '10' : colors.cardBackground,
                      borderColor: isSelected ? colors.primary : colors.border,
                    }
                  ]}
                  onPress={() => handleAnswerSelect(optionValue)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.optionLabel,
                    { color: isSelected ? colors.primary : colors.text }
                  ]}>
                    {optionLabel}.
                  </Text>
                  <View style={styles.optionTextContainer}>
                    <MathRenderer 
                      content={optionValue} 
                      color={isSelected ? colors.primary : colors.text} 
                    />
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>

      {/* Navigation Footer */}
      <View style={[styles.footer, { backgroundColor: colors.cardBackground, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestionIndex === 0 && { opacity: 0.5 }]}
          onPress={handlePreviousQuestion}
          disabled={currentQuestionIndex === 0}
        >
          <ChevronLeft size={20} color={colors.text} />
          <Text style={[styles.navButtonText, { color: colors.text }]}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.success }]}
          onPress={() => setShowSubmitConfirm(true)}
        >
          <Text style={styles.submitButtonText}>Submit Test</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, currentQuestionIndex === questions.length - 1 && { opacity: 0.5 }]}
          onPress={handleNextQuestion}
          disabled={currentQuestionIndex === questions.length - 1}
        >
          <Text style={[styles.navButtonText, { color: colors.text }]}>Next</Text>
          <ChevronRight size={20} color={colors.text} />
        </TouchableOpacity>
      </View>

      {renderStatusModal()}
      {renderSubmitConfirmModal()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: Platform.OS === 'ios' ? 60 : 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  testTitle: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
    marginBottom: 2,
  },
  questionCounter: {
    fontSize: 14,
    fontFamily: 'Inter-Regular',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  timerText: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  statusButton: {
    padding: 8,
    borderRadius: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  questionCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
      web: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
    }),
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 18,
    fontFamily: 'Inter-Bold',
  },
  questionTextContainer: {
    marginBottom: 16,
    minHeight: 60,
  },
  examInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  examTag: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  examTagText: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  examYear: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
    marginRight: 12,
    minWidth: 24,
  },
  optionTextContainer: {
    flex: 1,
    minHeight: 40,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    gap: 4,
    minWidth: 80,
  },
  navButtonText: {
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  submitButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusModal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
  },
  statsContainer: {
    padding: 16,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontFamily: 'Inter-Bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    fontFamily: 'Inter-Medium',
  },
  questionGrid: {
    flex: 1,
    padding: 16,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  questionGridItem: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  questionNumber: {
    fontSize: 16,
    fontFamily: 'Inter-Bold',
  },
  statusIconContainer: {
    position: 'absolute',
    top: 2,
    right: 2,
  },
  confirmModal: {
    width: '85%',
    borderRadius: 16,
    padding: 24,
  },
  confirmTitle: {
    fontSize: 20,
    fontFamily: 'Inter-Bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  confirmMessage: {
    fontSize: 16,
    fontFamily: 'Inter-Regular',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 24,
  },
  confirmStats: {
    marginBottom: 24,
  },
  confirmStatsText: {
    fontSize: 14,
    fontFamily: 'Inter-Medium',
    textAlign: 'center',
    marginBottom: 4,
  },
  confirmButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Inter-Medium',
  },
});