'use client'

import dynamic from 'next/dynamic'
import React from 'react'

const VideoRoom = dynamic(()=> import('@/src/components/VideoRoom'),{
    ssr : false
})

const RoomPage = () => {
  return (
    <div><VideoRoom/></div>
  )
}

export default RoomPage