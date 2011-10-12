using System;
using Microsoft.Phone.Controls;
using System.Collections.Generic;

namespace MoSync
{
    public class NativeUIModule : IIoctlModule
    {
        private NativeUI mNativeUI;
        private List<IWidget> mWidgets = new List<IWidget>();

        public void Init(Ioctls ioctls, Core core, Runtime runtime)
        {
            mNativeUI = new NativeUIWindowsPhone();

            ioctls.maWidgetCreate = delegate(int _widgetType)
            {
                String widgetType = core.GetDataMemory().ReadStringAtAddress(_widgetType);
                IWidget widget = mNativeUI.CreateWidget(widgetType);
                if (widget == null)
                    return MoSync.Constants.MAW_RES_INVALID_TYPE_NAME;

                for (int i = 0; i < mWidgets.Count; i++)
                {
                    if (mWidgets[i] == null)
                    {
                        mWidgets[i] = widget;
                        return i;
                    }
                }

                mWidgets.Add(widget);
                return mWidgets.Count-1;
            };

            ioctls.maWidgetDestroy = delegate(int _widget)
            {
                IWidget widget = mWidgets[_widget];
                widget.RemoveFromParent();
                mWidgets.Remove(widget);
                return MoSync.Constants.MAW_RES_OK;
            };

            ioctls.maWidgetAddChild = delegate(int _parent, int _child)
            {
                IWidget parent = mWidgets[_parent];
                IWidget child = mWidgets[_child];
                parent.AddChild(child);
                return MoSync.Constants.MAW_RES_OK;
            };

            ioctls.maWidgetRemoveChild = delegate(int _child)
            {
                IWidget child = mWidgets[_child];
                child.RemoveFromParent();
                return MoSync.Constants.MAW_RES_OK;
            };

            ioctls.maWidgetInsertChild = delegate(int _parent, int _child, int index)
            {
                IWidget parent = mWidgets[_parent];
                IWidget child = mWidgets[_child];
                parent.InsertChild(child, index);
                return MoSync.Constants.MAW_RES_OK;
            };

            ioctls.maWidgetStackScreenPush = delegate(int _stackScreen, int _newScreen)
            {
                return MoSync.Constants.MAW_RES_OK;
            };

            ioctls.maWidgetStackScreenPop = delegate(int _stackScreen)
            {
                return MoSync.Constants.MAW_RES_OK;
            };

            ioctls.maWidgetSetProperty = delegate(int _widget, int _property, int _value)
            {
                String property = core.GetDataMemory().ReadStringAtAddress(_property);
                String value = core.GetDataMemory().ReadStringAtAddress(_value);
                IWidget widget = mWidgets[_widget];
                widget.SetProperty(property, value);
                return MoSync.Constants.MAW_RES_OK;
            };

            ioctls.maWidgetGetProperty = delegate(int _widget, int _property, int _value, int _bufSize)
            {
                String property = core.GetDataMemory().ReadStringAtAddress(_property);
                IWidget widget = mWidgets[_widget];
                String value = widget.GetProperty(property);
                core.GetDataMemory().WriteStringAtAddress(_value, value, _bufSize);
                return MoSync.Constants.MAW_RES_OK;
            };

            ioctls.maWidgetScreenShow = delegate(int _screenHandle)
            {
                Screen screen = (Screen)mWidgets[_screenHandle];
                screen.Show();

                return MoSync.Constants.MAW_RES_OK;
            };

        }
    }
}
