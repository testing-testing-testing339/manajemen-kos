'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import Notification from './ui/Notification'

interface NotificationItem {
  id: string
  title: string
  message: string
  type: 'info' | 'success' | 'warning' | 'error'
}

export default function NotificationManager({ 
  userId,
  userRole 
}: { 
  userId: string | null
  userRole: string | null
}) {
  const [notifications, setNotifications] = useState<NotificationItem[]>([])

  useEffect(() => {
    if (!userId || (userRole !== 'owner' && userRole !== 'staff')) {
      return
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Subscribe to new check-in requests
    const checkInChannel = supabase
      .channel('check-in-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'check_in_requests',
          filter: 'status=eq.pending',
        },
        (payload) => {
          console.log('New check-in request:', payload)
          
          // Play notification sound
          playNotificationSound()
          
          // Show notification
          const newNotification: NotificationItem = {
            id: `checkin-${payload.new.id}-${Date.now()}`,
            title: 'Check-in Baru! 🎉',
            message: `Ada permintaan check-in baru dari ${payload.new.full_name || 'Penyewa'}`,
            type: 'info',
          }
          
          setNotifications((prev) => [...prev, newNotification])
          
          // Update badge in sidebar
          window.dispatchEvent(new CustomEvent('checkin-updated'))
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(checkInChannel)
    }
  }, [userId, userRole])

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  return (
    <>
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{ top: `${4 + index * 5}rem` }}
          className="fixed right-4 z-[10000]"
        >
          <Notification
            title={notification.title}
            message={notification.message}
            type={notification.type}
            onClose={() => removeNotification(notification.id)}
          />
        </div>
      ))}
    </>
  )
}

// Function to play notification sound
function playNotificationSound() {
  try {
    // Try to use Web Audio API for better browser support
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioContext) {
      console.log('AudioContext not supported')
      return
    }
    
    const audioContext = new AudioContext()
    
    // Create a pleasant notification sound (two-tone beep)
    const oscillator1 = audioContext.createOscillator()
    const oscillator2 = audioContext.createOscillator()
    const gainNode = audioContext.createGain()
    
    oscillator1.connect(gainNode)
    oscillator2.connect(gainNode)
    gainNode.connect(audioContext.destination)
    
    // First tone
    oscillator1.frequency.value = 800
    oscillator1.type = 'sine'
    
    // Second tone (higher)
    oscillator2.frequency.value = 1000
    oscillator2.type = 'sine'
    
    gainNode.gain.setValueAtTime(0, audioContext.currentTime)
    gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + 0.1)
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3)
    
    oscillator1.start(audioContext.currentTime)
    oscillator1.stop(audioContext.currentTime + 0.3)
    
    oscillator2.start(audioContext.currentTime + 0.15)
    oscillator2.stop(audioContext.currentTime + 0.3)
  } catch (error) {
    console.log('Notification sound error:', error)
  }
}

