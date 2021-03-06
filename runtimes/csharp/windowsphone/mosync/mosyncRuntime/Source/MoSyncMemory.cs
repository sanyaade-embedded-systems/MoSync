using System;
using System.IO;

namespace MoSync
{

    // a class that wraps memory
    // This is the interface to the data memory segment for the mosync core.
    // It is also used for binary resources among other things.
    // This should probably implement the stream interface in order to be able to pass it to functions that require streams.
    // TODO: maybe this should implement another interface (like Stream)
    // so that code can be efficiently shared between binary resources
    // and unloaded binary resources. Now ubins are loaded into memory also,
    // in order to get something up and running quickly.
    public class Memory
    {
        protected byte[] mData;
        protected int mSizeInBytes;

        public Memory(int sizeInBytes)
        {
            mSizeInBytes = sizeInBytes;
            mData = new byte[mSizeInBytes];
        }

        public void WriteUInt8(int address, byte b)
        {
            mData[address] = b;
        }

        public void WriteInt8(int address, sbyte b)
        {
            mData[address] = (byte)b;
        }

        public void WriteUInt16(int address, ushort b)
        {
            mData[address + 0] = (byte)(b);
            mData[address + 1] = (byte)(b >> 8);
        }

        public void WriteInt16(int address, short b)
        {
			mData[address + 0] = (byte)((ushort)b);
            mData[address + 1] = (byte)((ushort)b >> 8);
        }

        public void WriteUInt32(int address, uint b)
        {
            mData[address + 0] = (byte)(b);
            mData[address + 1] = (byte)(b >> 8);
            mData[address + 2] = (byte)(b >> 16);
            mData[address + 3] = (byte)(b >> 24);
        }

        public void WriteInt32(int address, int b)
        {
			mData[address + 0] = (byte)((uint)b);
			mData[address + 1] = (byte)((uint)b >> 8);
			mData[address + 2] = (byte)((uint)b >> 16);
			mData[address + 3] = (byte)((uint)b >> 24);
        }

        public byte ReadUInt8(int address)
        {
            return mData[address];
        }

        public sbyte ReadInt8(int address)
        {
            return (sbyte)mData[address];
        }

        public ushort ReadUInt16(int address)
        {
			return (ushort)	((int)mData[address + 0] |
							((int)mData[address + 1] << 8));
        }

        public short ReadInt16(int address)
        {
			return (short)	((int)mData[address + 0] |
							((int)mData[address + 1] << 8));
        }

        public uint ReadUInt32(int address)
        {
			return (uint)((int)mData[address + 0] |
							((int)mData[address + 1] << 8) |
							((int)mData[address + 2] << 16) |
							((int)mData[address + 3] << 24));
        }

        public int ReadInt32(int address)
        {
			return (int)((int)mData[address + 0] |
							((int)mData[address + 1] << 8) |
							((int)mData[address + 2] << 16) |
							((int)mData[address + 3] << 24));
        }

        public int GetSizeInBytes()
        {
            return mSizeInBytes;
        }

        // reads a null-terminated ascii c string
        public String ReadStringAtAddress(int address)
        {
            int endaddress = address;
            while (mData[endaddress] != 0) endaddress++;
            return System.Text.UTF8Encoding.UTF8.GetString(mData, address, endaddress - address);
        }

        // reads a null-terminated unicode string.
        public String ReadWStringAtAddress(int address)
        {
            int endaddress = address;
            while (ReadInt16(endaddress) != 0) endaddress += 2;
            return System.Text.UnicodeEncoding.Unicode.GetString(mData, address, endaddress - address);
        }

        public void WriteStringAtAddress(int address, String str, int maxSize)
        {
            char[] data = str.ToCharArray();
            int i;
            for (i = 0; i < data.Length; i++)
            {
                if (i >= maxSize)
                    break;
                WriteUInt8(address + i, (byte)data[i]);
            }

            if (i >= maxSize)
                return;
            WriteUInt8(address + i, 0);
        }

        public void WriteWStringAtAddress(int address, String str, int maxSize)
        {
            char[] data = str.ToCharArray();
            int i;
            for (i = 0; i < data.Length; i++)
            {
                if (i >= maxSize)
                    break;
                WriteInt16(address + i * 2, (short)data[i]);
            }

            if (i >= maxSize)
                return;
            WriteInt16(address + i * 2, 0);
        }

        public void ReadBytes(byte[] bytes, int src, int size)
        {
            //System.Array.Copy(mData, src, bytes, 0, size);
			System.Buffer.BlockCopy(mData, src, bytes, 0, size);
		}

        // size equals the amount of integers
        public void ReadIntegers(int[] integers, int src, int size)
        {
			// Use System.Buffer.BlockCopy if aligned?
            for (int i = 0; i < size; i++)
            {
                integers[i] = ReadInt32(src + i * 4);
            }
        }

        public void WriteMemoryAtAddress(int dstaddress, Memory memory, int srcaddress, int length)
        {
            byte[] srcBytes = memory.mData;
            //System.Array.Copy(srcBytes, srcaddress, mData, dstaddress, length);
			System.Buffer.BlockCopy(srcBytes, srcaddress, mData, dstaddress, length);
        }

        public void WriteFromStream(int dstaddress, Stream stream, int length)
        {
            stream.Read(mData, dstaddress, length);
        }

        public void FillRange(int dstaddress, byte val, int length)
        {
			if (val == 0)
			{
				System.Array.Clear(mData, dstaddress, length);
				return;
			}

			length += dstaddress;
			for (; dstaddress < length; dstaddress++)
            {
				mData[dstaddress] = val;
            }
        }

        public byte[] GetData()
        {
            return mData;
        }

        public Stream GetStream()
        {
            return new System.IO.MemoryStream((byte[])mData);
        }

        public Stream GetStream(int offset, int size)
        {
            return new System.IO.MemoryStream((byte[])mData, offset, size);
        }

    }
}
