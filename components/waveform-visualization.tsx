'use client'

import React, { useEffect, useRef } from 'react'

interface WaveformVisualizationProps {
  isPlaying: boolean
  progress: number
}

export function WaveformVisualization({
  isPlaying,
  progress,
}: WaveformVisualizationProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const barsRef = useRef<number[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Initialize bars if empty
    if (barsRef.current.length === 0) {
      barsRef.current = Array.from({ length: 40 }, () => Math.random() * 0.5)
    }

    const animate = () => {
      const width = canvas.width
      const height = canvas.height

      // Clear canvas
      ctx.fillStyle = 'rgba(18, 18, 18, 0.5)'
      ctx.fillRect(0, 0, width, height)

      const barWidth = width / barsRef.current.length
      const centerY = height / 2

      barsRef.current.forEach((bar, index) => {
        // Animate bars
        const target = isPlaying ? Math.random() * 0.8 + 0.2 : 0.3
        barsRef.current[index] += (target - bar) * 0.1

        // Create gradient for each bar
        const gradient = ctx.createLinearGradient(0, centerY - bar * centerY * 2, 0, centerY + bar * centerY * 2)
        
        // Progress color for passed bars
        if (index / barsRef.current.length < progress) {
          gradient.addColorStop(0, '#fbbf24')
          gradient.addColorStop(0.5, '#f59e0b')
          gradient.addColorStop(1, '#d97706')
        } else {
          gradient.addColorStop(0, '#ef4444')
          gradient.addColorStop(0.5, '#dc2626')
          gradient.addColorStop(1, '#991b1b')
        }

        ctx.fillStyle = gradient
        const barHeight = Math.max(2, barsRef.current[index] * centerY * 2)
        ctx.fillRect(index * barWidth + 1, centerY - barHeight / 2, barWidth - 2, barHeight)

        // Add glow effect for active bars
        if (index / barsRef.current.length < progress + 0.05) {
          ctx.shadowColor = '#f59e0b'
          ctx.shadowBlur = 8
          ctx.fillStyle = 'rgba(245, 158, 11, 0.3)'
          ctx.fillRect(index * barWidth + 1, centerY - barHeight / 2 - 4, barWidth - 2, barHeight + 8)
        }
      })

      ctx.shadowColor = 'transparent'
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isPlaying, progress])

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={80}
      className="w-full h-20 rounded-lg"
    />
  )
}
