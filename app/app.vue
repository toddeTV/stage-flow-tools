<template>
  <NuxtPage />
</template>

<style>
/* Reset and Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 16px;
  line-height: 1.6;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  background: #f5f5f5;
  color: #000;
  min-height: 100vh;
  position: relative;
}

/* Background Pattern */
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    repeating-linear-gradient(
      0deg,
      transparent,
      transparent 50px,
      rgba(0, 0, 0, 0.03) 50px,
      rgba(0, 0, 0, 0.03) 100px
    ),
    repeating-linear-gradient(
      90deg,
      transparent,
      transparent 50px,
      rgba(0, 0, 0, 0.03) 50px,
      rgba(0, 0, 0, 0.03) 100px
    );
  pointer-events: none;
  z-index: -1;
}

/* Sharp Design - No Rounded Corners */
input,
button,
textarea,
select,
div,
section,
article,
header,
footer,
nav {
  border-radius: 0 !important;
}

/* Focus Styles */
input:focus,
textarea:focus,
select:focus,
button:focus {
  outline: 3px solid #000;
  outline-offset: 2px;
}

/* Selection */
::selection {
  background: #000;
  color: #fff;
}

/* Scrollbar */
::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

::-webkit-scrollbar-track {
  background: #f5f5f5;
  border: 1px solid #000;
}

::-webkit-scrollbar-thumb {
  background: #000;
  border: 1px solid #f5f5f5;
}

::-webkit-scrollbar-thumb:hover {
  background: #333;
}

/* Animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.page-enter-active,
.page-leave-active {
  transition: all 0.3s;
}

.page-enter-from {
  opacity: 0;
  transform: translateX(-20px);
}

.page-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

/* Utility Classes */
.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

.text-center {
  text-align: center;
}

.uppercase {
  text-transform: uppercase;
}

.bold {
  font-weight: bold;
}

/* Sharp Corners for All Elements */
* {
  border-radius: 0 !important;
}
</style>
