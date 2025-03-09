import React, { useEffect } from 'react';
import styled from '@emotion/styled';
import { keyframes } from '@emotion/react';

// Create animations for the celebration effect
const confettiAnimation = keyframes`
  0% { transform: translateY(0) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-1000px) rotate(720deg); opacity: 0; }
`;

const fadeInOut = keyframes`
  0% { opacity: 0; transform: scale(0.8); }
  10% { opacity: 1; transform: scale(1.1); }
  80% { opacity: 1; transform: scale(1); }
  100% { opacity: 0; transform: scale(0.8); }
`;

const bounce = keyframes`
  0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
  40% { transform: translateY(-15px); }
  60% { transform: translateY(-7px); }
`;

const shine = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const pulse = keyframes`
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
`;

// Create a celebration container for the animation
const CelebrationContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 999;
  display: flex;
  justify-content: center;
  align-items: center;
  overflow: hidden;
`;

// Confetti piece - make them more vibrant and varied
const Confetti = styled.div<{ delay: number; color: string; size: number; left: number; top: number; shape: string }>`
  position: absolute;
  width: ${(props) => props.size}px;
  height: ${(props) => props.size}px;
  background-color: ${(props) => props.color};
  top: ${(props) => 40 + props.top}%;
  left: ${(props) => props.left}%;
  opacity: 0;
  border-radius: ${(props) => props.shape === 'circle' ? '50%' : props.shape === 'triangle' ? '0% 50% 50% 50%' : '0'};
  animation: ${confettiAnimation} 2.5s ease-in-out forwards;
  animation-delay: ${(props) => props.delay}s;
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.3);
`;

// Create a component for the success message with improved design
const CompletionMessage = styled.div`
  position: fixed;
  min-width: 180px;
  max-width: 240px;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(6, 95, 70, 0.95));
  background-size: 200% 200%;
  animation: ${fadeInOut} 2.2s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards, 
             ${shine} 3s linear infinite;
  color: white;
  padding: 12px 18px;
  border-radius: 16px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4), 0 0 15px rgba(16, 185, 129, 0.5);
  font-weight: bold;
  font-size: 20px;
  z-index: 1000;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0 auto;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border: 2px solid rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  /* Make sure it always stays centered */
  inset: 0;
  margin: auto;
  height: fit-content;
  width: fit-content;
`;

// Trophy icon with improved animation
const TrophyIcon = styled.div`
  font-size: 26px;
  animation: ${pulse} 1.5s ease-in-out infinite;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
`;

// Letter container as a single inline element
const LetterContainer = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  line-height: 1;
  position: relative;
  height: 30px;
`;

// Letter for animation
const AnimatedLetter = styled.span<{ delay: number }>`
  display: inline-block;
  animation: ${bounce} 1.8s ease infinite;
  animation-delay: ${(props) => props.delay}s;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  padding: 0;
  margin: 0;
  position: relative;
  font-size: 20px;
  height: 30px;
  line-height: 30px;
  vertical-align: middle;
`;

// Set the text content directly instead of splitting letters
// This ensures proper character rendering especially with diacritical marks
const TextContent = styled.div`
  animation: ${bounce} 1.8s ease infinite;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.5);
  font-size: 20px;
  line-height: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

interface TaskCompletionAnimationProps {
  onAnimationEnd?: () => void;
}

const TaskCompletionAnimation: React.FC<TaskCompletionAnimationProps> = ({ onAnimationEnd }) => {
  // Vibrant colors that pop against dark background
  const confettiColors = [
    '#FFD700', // gold
    '#FF6347', // tomato
    '#00CED1', // dark turquoise
    '#9370DB', // medium purple
    '#32CD32', // lime green
    '#FF69B4', // hot pink
    '#1E90FF', // dodger blue
    '#FFFFFF'  // white for extra visibility
  ];
  
  const confettiCount = 30; // Slightly more confetti for a more festive feel
  const message = "Tuyệt vời!"; // Vietnamese for "Excellent!"
  
  useEffect(() => {
    console.log('TaskCompletionAnimation mounted');
    
    // Keep animation time at 2.2 seconds for responsiveness
    const timer = setTimeout(() => {
      console.log('Animation timeout fired, calling onAnimationEnd');
      if (onAnimationEnd) {
        onAnimationEnd();
      }
    }, 2200);
    
    return () => {
      console.log('TaskCompletionAnimation unmounted');
      clearTimeout(timer);
    };
  }, [onAnimationEnd]);
  
  // Helper function to get a random confetti shape
  const getRandomShape = () => {
    const shapes = ['square', 'circle', 'triangle'];
    return shapes[Math.floor(Math.random() * shapes.length)];
  };
  
  return (
    <CelebrationContainer>
      {Array.from({ length: confettiCount }).map((_, i) => (
        <Confetti 
          key={i} 
          delay={Math.random() * 0.3} 
          color={confettiColors[Math.floor(Math.random() * confettiColors.length)]} 
          size={Math.floor(Math.random() * 8) + 4}
          left={20 + Math.random() * 60} // Wider distribution
          top={Math.random() * 40 - 20} // More vertical distribution
          shape={getRandomShape()} // Random shapes for more visual interest
        />
      ))}
      <CompletionMessage>
        <TrophyIcon>🏆</TrophyIcon>
        <TextContent>
          {message}
        </TextContent>
      </CompletionMessage>
    </CelebrationContainer>
  );
};

export default TaskCompletionAnimation; 
