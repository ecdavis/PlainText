#ifndef VECTOR3D_H
#define VECTOR3D_H

#include <QScriptValue>
#include <QString>
#include <QVariant>

#include "constants.h"
#include "metatyperegistry.h"


class Vector3D {

    public:
        int x;
        int y;
        int z;

        Vector3D() = default;
        Vector3D(int x, int y, int z);

        bool isNull() const;

        bool operator==(const Vector3D &other) const;
        bool operator!=(const Vector3D &other) const;

        Vector3D operator+(const Vector3D &other) const;
        Vector3D operator-(const Vector3D &other) const;

        int length() const;
        Vector3D normalized() const;

        int operator*(const Vector3D &other) const;

        double angle(const Vector3D &other) const;

        QString toString() const;

        static QString toUserString(const Vector3D &vector);
        static void fromUserString(const QString &string, Vector3D &vector);

        static QString toJsonString(const Vector3D &vector, Options options = NoOptions);
        static void fromVariant(const QVariant &variant, Vector3D &vector);

        static QScriptValue toScriptValue(QScriptEngine *engine, const Vector3D &vector);
        static void fromScriptValue(const QScriptValue &object, Vector3D &vector);
};

Vector3D operator*(int scalar, const Vector3D &vector);

PT_DECLARE_SERIALIZABLE_METATYPE(Vector3D)

#endif // VECTOR3D_H
